import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { Router, Response } from "express";
import { protect, AuthRequest } from "../middleware/auth.middleware";
import { Pipeline, DEFAULT_STAGES } from "../models/Pipeline.model";
import { Job } from "../models/Job.model";
import { Candidate } from "../models/Candidate.model";
import { ScreeningResult } from "../models/ScreeningResult.model";
import { PracticalSubmission } from "../models/PracticalSubmission.model";
import { InterviewSession } from "../models/InterviewSession.model";
import { getMsBetweenCandidates, sleep } from "../config/llmBatch";
import { buildHrContextStringForJob } from "../services/pipelineHrContext.service";
import { screenCandidate } from "../services/screening.service";
import { draftEmailsForStageOutcome, draftPracticalInvitationEmails } from "../services/applicantComms.service";
import { sendApplicantEmail, isEmailConfigured } from "../services/email.service";
import { gradeAllPending, gradeSubmission, compareAndRankSubmissions } from "../services/practicalAssessment.service";
import { aiGeneratePracticalAssessment, aiGenerateDatasets } from "../services/practicalAssessmentBuilder.service";
import { generateInterviewQuestions } from "../services/interview.service";
import { geminiChatText } from "../config/gemini";
import type { IPracticalAssessmentDefinition, IAssessmentResource } from "../models/assessmentDefinition";

const router = Router();
router.use(protect);

/**
 * Picks up to `targetCount` candidates for the next pipeline step: tiers strong_yes → yes → maybe
 * (highest overallScore first within each tier). Never auto-selects `no`.
 */
/** Mark pool members as shortlisted or rejected at this stage (not shortlisted = rejected at this step). */
async function applyStageShortlistOutcomes(
  jobId: mongoose.Types.ObjectId | string,
  stageIndex: number,
  stageName: string,
  poolIds: mongoose.Types.ObjectId[],
  shortlistedIds: mongoose.Types.ObjectId[]
): Promise<void> {
  const shortSet = new Set(shortlistedIds.map(id => String(id)));
  for (const pid of poolIds) {
    const idStr = String(pid);
    if (shortSet.has(idStr)) {
      await Candidate.updateOne(
        { _id: pid, jobId },
        {
          $set: { status: "shortlisted" },
          $unset: { rejectedAtStageIndex: 1, rejectedAtStageName: 1 },
        }
      );
    } else {
      await Candidate.updateOne(
        { _id: pid, jobId },
        {
          $set: {
            status: "rejected",
            rejectedAtStageIndex: stageIndex,
            rejectedAtStageName: stageName,
          },
        }
      );
    }
  }
}

function pickAiShortlistIds(
  results: { candidateId: unknown; recommendation: string; overallScore: number }[],
  targetCount: number
): mongoose.Types.ObjectId[] {
  if (targetCount <= 0 || !results.length) return [];
  const strongYes = results
    .filter(r => r.recommendation === "strong_yes")
    .sort((a, b) => b.overallScore - a.overallScore);
  const yes = results
    .filter(r => r.recommendation === "yes")
    .sort((a, b) => b.overallScore - a.overallScore);
  const maybe = results
    .filter(r => r.recommendation === "maybe")
    .sort((a, b) => b.overallScore - a.overallScore);
  const ordered = [...strongYes, ...yes, ...maybe];
  return ordered.slice(0, targetCount).map(r => {
    const id = r.candidateId;
    if (id instanceof mongoose.Types.ObjectId) return id;
    if (typeof id === "object" && id !== null && "_id" in (id as object)) {
      return new mongoose.Types.ObjectId(String((id as { _id: unknown })._id));
    }
    return new mongoose.Types.ObjectId(String(id));
  });
}

async function syncPracticalTemplateFromJob(jobId: string): Promise<void> {
  const job = await Job.findById(jobId).lean();
  const tpl = job?.practicalAssessmentTemplate as IPracticalAssessmentDefinition | undefined;
  const hasContent = !!(tpl?.questions?.length || tpl?.sections?.length || tpl?.projectInstructions?.trim());
  if (!hasContent) return;
  const pipeline = await Pipeline.findOne({ jobId });
  if (!pipeline) return;
  const pIdx = pipeline.stages.findIndex(s => s.type === "practical");
  if (pIdx < 0) return;
  // Always sync from job if job has content (HR updates should flow through)
  pipeline.stages[pIdx].assessmentDefinition = tpl;
  pipeline.markModified('stages');
  await pipeline.save();
}

/** Auto-heal: if practical stage candidateIds is empty but previous stage has shortlistedIds, copy them over */
async function syncPracticalPoolFromPreviousStage(jobId: string): Promise<void> {
  const pipeline = await Pipeline.findOne({ jobId });
  if (!pipeline) return;
  const pIdx = pipeline.stages.findIndex(s => s.type === "practical");
  if (pIdx <= 0) return; // no practical stage or it's the first stage
  const practicalStage = pipeline.stages[pIdx];
  if ((practicalStage.candidateIds || []).length > 0) return; // already has pool
  const prevStage = pipeline.stages[pIdx - 1];
  const shortlist = prevStage?.shortlistedIds || [];
  if (shortlist.length === 0) return; // nothing to copy
  pipeline.stages[pIdx].candidateIds = shortlist.map(id => new mongoose.Types.ObjectId(String(id)));
  await pipeline.save();
}

/* GET /pipeline/:jobId  — get or auto-create */
router.get("/:jobId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      pipeline = await Pipeline.create({
        jobId: req.params.jobId,
        currentStageIndex: 0,
        stages: DEFAULT_STAGES.map(s => ({ ...s })),
      });
    }
    await syncPracticalTemplateFromJob(req.params.jobId);
    await syncPracticalPoolFromPreviousStage(req.params.jobId);
    const fresh = (await Pipeline.findOne({ jobId: req.params.jobId })) || pipeline;
    res.json({ success: true, data: fresh });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* PATCH /pipeline/:jobId/stage/:idx/hr-inputs  — save HR guidance for a stage */
router.patch("/:jobId/stage/:idx/hr-inputs", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) { res.status(404).json({ success: false, error: "Pipeline not found" }); return; }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" }); return;
    }
    const { targetCount, preferences, criteria, notes } = req.body;
    pipeline.stages[idx].hrInputs = {
      targetCount: Number(targetCount) || 0,
      preferences: preferences ?? "",
      criteria: criteria ?? "",
      notes: notes ?? "",
    };
    await pipeline.save();
    res.json({ success: true, data: pipeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/run  — run AI screening for a stage */
router.post("/:jobId/stage/:idx/run", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) { res.status(404).json({ success: false, error: "Pipeline not found" }); return; }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" }); return;
    }
    const job = await Job.findById(req.params.jobId);
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }

    const stage = pipeline.stages[idx];

    /* Determine which candidates to screen */
    let candidateIds: any[];
    if (idx === 0) {
      const all = await Candidate.find({ jobId: req.params.jobId }).select("_id");
      candidateIds = all.map(c => c._id);
    } else {
      candidateIds = pipeline.stages[idx - 1].shortlistedIds;
    }
    if (!candidateIds.length) {
      res.status(400).json({ success: false, error: "No candidates to screen at this stage" }); return;
    }

    pipeline.stages[idx].candidateIds = candidateIds;
    pipeline.stages[idx].status = "running";
    await pipeline.save();

    /* HR context for this stage (same builder as standalone screening uses for stage 0) */
    const hrContext = await buildHrContextStringForJob(req.params.jobId, idx);

    const candidates = await Candidate.find({ _id: { $in: candidateIds } });
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const gap = getMsBetweenCandidates();
        if (gap > 0 && i > 0) {
          await sleep(gap);
        }
        console.log(`[Pipeline] Screening candidate ${candidate._id} (${candidate.firstName} ${candidate.lastName}) for stage ${stage.name}`);
        const result = await screenCandidate(job, candidate, hrContext, stage.type);
        console.log(`[Pipeline] Got result for ${candidate._id}: score=${result.overallScore}, rec=${result.recommendation}`);
        const s = await ScreeningResult.findOneAndUpdate(
          { jobId: req.params.jobId, candidateId: candidate._id },
          { ...result, jobId: req.params.jobId, candidateId: candidate._id },
          { upsert: true, new: true }
        );
        console.log(`[Pipeline] Saved screening result ${s._id} for candidate ${candidate._id}`);
        await Candidate.findByIdAndUpdate(candidate._id, { status: "screened" });
        results.push(s);
      } catch (e: any) {
        console.error(`[Pipeline] Error screening candidate ${candidate._id}:`, e.message);
        errors.push({ candidateId: candidate._id, error: e.message });
      }
    }

    /* Rank results */
    const sorted = results.sort((a, b) => b.overallScore - a.overallScore);
    for (let i = 0; i < sorted.length; i++) {
      await ScreeningResult.findByIdAndUpdate(sorted[i]._id, { rank: i + 1 });
    }

    const targetCount = Math.max(0, Math.floor(Number(stage.hrInputs?.targetCount) || 0));
    const aiShortlist = pickAiShortlistIds(
      sorted.map(s => ({
        candidateId: s.candidateId,
        recommendation: String(s.recommendation),
        overallScore: Number(s.overallScore) || 0,
      })),
      targetCount
    );

    pipeline.stages[idx].shortlistedIds = aiShortlist;
    pipeline.stages[idx].status = "done";
    pipeline.stages[idx].ranAt = new Date();
    await pipeline.save();

    await applyStageShortlistOutcomes(
      req.params.jobId,
      idx,
      stage.name,
      candidateIds.map(id => new mongoose.Types.ObjectId(String(id))),
      aiShortlist
    );

    const pipelineFresh = (await Pipeline.findOne({ jobId: req.params.jobId })) || pipeline;

    res.json({
      success: true,
      data: {
        screened: results.length,
        errors,
        total: candidateIds.length,
        aiShortlistCount: aiShortlist.length,
        targetCount,
        pipeline: pipelineFresh,
      },
    });
  } catch (err: any) {
    console.error("[Pipeline] Run stage error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/shortlist  — confirm shortlist and unlock next stage */
router.post("/:jobId/stage/:idx/shortlist", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) { res.status(404).json({ success: false, error: "Pipeline not found" }); return; }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" }); return;
    }
    const { shortlistedIds } = req.body;
    if (!Array.isArray(shortlistedIds)) {
      res.status(400).json({ success: false, error: "shortlistedIds must be an array" }); return;
    }
    const stage = pipeline.stages[idx];
    const poolIds = (stage.candidateIds || []).map(id => new mongoose.Types.ObjectId(String(id)));
    const shortlistObjIds = shortlistedIds.map((id: string) => new mongoose.Types.ObjectId(String(id)));

    pipeline.stages[idx].shortlistedIds = shortlistObjIds;
    pipeline.stages[idx].status = "done";
    if (idx < pipeline.stages.length - 1) {
      pipeline.currentStageIndex = Math.max(pipeline.currentStageIndex, idx + 1);
      // Seed the next stage's candidateIds so pool checks work without a separate run step
      pipeline.stages[idx + 1].candidateIds = shortlistObjIds;
    }
    await pipeline.save();

    if (poolIds.length > 0) {
      await applyStageShortlistOutcomes(req.params.jobId, idx, stage.name, poolIds, shortlistObjIds);
    }

    // Auto-create interview sessions when practical stage is shortlisted and next stage is ai_interview
    if (stage.type === "practical" && idx < pipeline.stages.length - 1) {
      const nextStage = pipeline.stages[idx + 1];
      if (nextStage.type === "ai_interview") {
        try {
          const jobDoc = await Job.findById(req.params.jobId);
          if (jobDoc) {
            const questions = await generateInterviewQuestions(jobDoc);
            const windowStart = new Date();
            const windowEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            for (const candidateId of shortlistObjIds) {
              const existing = await InterviewSession.findOne({
                jobId: jobDoc._id,
                candidateId,
                pipelineStageIndex: idx + 1,
              });
              if (!existing) {
                const token = crypto.randomBytes(24).toString("hex");
                await InterviewSession.create({
                  jobId: jobDoc._id,
                  candidateId,
                  pipelineStageIndex: idx + 1,
                  inviteToken: token,
                  status: "pending",
                  windowStart,
                  windowEnd,
                  interviewQuestions: questions,
                });
              }
            }
          }
        } catch (e) {
          console.error("[pipeline] auto-create interview sessions:", e);
        }
      }
    }

    const pipelineFresh = (await Pipeline.findOne({ jobId: req.params.jobId })) || pipeline;
    res.json({ success: true, data: pipelineFresh });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* PATCH /pipeline/:jobId/stage/:idx/applicant-comms — Practical Assessment only: exam link, deadline, format */
router.patch("/:jobId/stage/:idx/applicant-comms", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    if (pipeline.stages[idx].type !== "practical") {
      res.status(400).json({
        success: false,
        error: "Applicant exam settings apply only to the Practical Assessment stage.",
      });
      return;
    }
    const cur = pipeline.stages[idx].applicantComms;
    const base = {
      assessmentUrl: "",
      assessmentFormat: "",
      submissionDeadlineAt: "",
      interviewUrl: "",
      interviewDurationMins: 30,
      extraInstructions: "",
      ...((cur && typeof cur === "object" ? cur : {}) as Record<string, unknown>),
    };
    const {
      assessmentUrl,
      assessmentFormat,
      submissionDeadlineAt,
      interviewUrl,
      interviewDurationMins,
      extraInstructions,
    } = req.body || {};
    pipeline.stages[idx].applicantComms = {
      assessmentUrl: assessmentUrl !== undefined ? String(assessmentUrl) : String(base.assessmentUrl || ""),
      assessmentFormat: assessmentFormat !== undefined ? String(assessmentFormat) : String(base.assessmentFormat || ""),
      submissionDeadlineAt:
        submissionDeadlineAt !== undefined ? String(submissionDeadlineAt) : String(base.submissionDeadlineAt || ""),
      interviewUrl: interviewUrl !== undefined ? String(interviewUrl) : String(base.interviewUrl || ""),
      interviewDurationMins:
        interviewDurationMins !== undefined ? Math.max(0, Number(interviewDurationMins) || 0) : Number(base.interviewDurationMins) || 30,
      extraInstructions: extraInstructions !== undefined ? String(extraInstructions) : String(base.extraInstructions || ""),
    };
    await pipeline.save();
    res.json({ success: true, data: pipeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* PATCH /pipeline/:jobId/stage/:idx/assessment-definition — Practical stage: form/project content */
router.patch("/:jobId/stage/:idx/assessment-definition", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    if (pipeline.stages[idx].type !== "practical") {
      res.status(400).json({ success: false, error: "Assessment definition applies only to the Practical stage." });
      return;
    }
    const def = req.body as IPracticalAssessmentDefinition;
    if (!def || (!Array.isArray(def.questions) && !Array.isArray(def.sections))) {
      res.status(400).json({ success: false, error: "Invalid assessment definition." });
      return;
    }
    const sanitiseQ = (q: any, fallbackId: string) => ({
      id: String(q.id || fallbackId),
      label: String(q.label || "Question"),
      inputType: ["text", "textarea", "file", "multiple_choice"].includes(q.inputType) ? q.inputType : "textarea",
      options: q.inputType === "multiple_choice" && Array.isArray(q.options) ? q.options.map(String) : [],
    });

    // Preserve any AI-generated resources (datasets, etc.) — don't wipe them on manual edits
    const existing = pipeline.stages[idx].assessmentDefinition as any;
    const existingResources: IAssessmentResource[] = Array.isArray(existing?.resources)
      ? JSON.parse(JSON.stringify(existing.resources))
      : [];
    // Caller may also send updated resources; merge (caller wins if provided)
    const incomingResources: IAssessmentResource[] = Array.isArray(def.resources)
      ? def.resources
      : existingResources;

    pipeline.stages[idx].assessmentDefinition = {
      mode: (["form","project","both"].includes(def.mode as string) ? def.mode : "form") as "form"|"project"|"both",
      title: String(def.title || "Practical assessment"),
      questions: (Array.isArray(def.questions) ? def.questions : []).map((q, i) => sanitiseQ(q, `q${i + 1}`)),
      sections: (Array.isArray(def.sections) ? def.sections : []).map((s, si) => ({
        title: String(s.title || `Section ${si + 1}`),
        description: String(s.description || ""),
        questions: (Array.isArray(s.questions) ? s.questions : []).map((q, qi) => sanitiseQ(q, `s${si + 1}q${qi + 1}`)),
      })),
      projectInstructions: String(def.projectInstructions || ""),
      maxFiles: Math.min(20, Math.max(1, Number(def.maxFiles) || 5)),
      maxFileMb: Math.min(50, Math.max(1, Number(def.maxFileMb) || 10)),
      resources: incomingResources,
    };
    pipeline.markModified('stages');
    await pipeline.save();
    res.json({ success: true, data: pipeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/assessment/generate-ai — AI draft form or project assessment from job */
router.post("/:jobId/stage/:idx/assessment/generate-ai", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    if (pipeline.stages[idx].type !== "practical") {
      res.status(400).json({ success: false, error: "Only for the Practical stage." });
      return;
    }
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    const mode = req.body?.mode === "project" ? "project" : "form";
    const hint = typeof req.body?.hint === "string" ? req.body.hint : "";

    // For project mode: generate datasets FIRST so the brief can reference exact filenames/columns
    let datasetMeta: import("../services/practicalAssessmentBuilder.service").IDatasetMeta[] = [];
    const resources: IAssessmentResource[] = [];

    if (mode === "project") {
      try {
        const datasets = await aiGenerateDatasets(job, "");   // seed from job description alone
        const resourcesDir = path.join(process.cwd(), "uploads", "assessment-resources", String(req.params.jobId));
        fs.mkdirSync(resourcesDir, { recursive: true });

        for (const ds of datasets) {
          const ts = Date.now();

          const csvStoredName = `${ts}_${ds.filename}`;
          fs.writeFileSync(path.join(resourcesDir, csvStoredName), ds.csvContent, "utf-8");
          resources.push({
            id: csvStoredName,
            name: ds.filename,
            storedName: csvStoredName,
            mimeType: "text/csv",
            sizeBytes: Buffer.byteLength(ds.csvContent, "utf-8"),
          });

          if (ds.xlsxBuffer) {
            const xlsxName = ds.filename.replace(/\.csv$/i, ".xlsx");
            const xlsxStoredName = `${ts + 1}_${xlsxName}`;
            fs.writeFileSync(path.join(resourcesDir, xlsxStoredName), ds.xlsxBuffer);
            resources.push({
              id: xlsxStoredName,
              name: xlsxName,
              storedName: xlsxStoredName,
              mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              sizeBytes: ds.xlsxBuffer.length,
            });
          }

          datasetMeta.push({ filename: ds.filename, description: ds.description, columns: ds.headers });
        }
      } catch (datasetErr: any) {
        console.warn("[pipeline] dataset generation failed:", datasetErr?.message);
      }
    }

    // Generate the assessment structure — pass dataset metadata for a richer, dataset-aware brief
    const def = await aiGeneratePracticalAssessment(job, mode, hint, datasetMeta.length ? datasetMeta : undefined);
    if (resources.length) def.resources = resources;

    pipeline.stages[idx].assessmentDefinition = def;
    // markModified is required: Mongoose doesn't deep-track nested array changes
    pipeline.markModified('stages');
    await pipeline.save();
    res.json({ success: true, data: { pipeline, assessmentDefinition: def } });
  } catch (err: any) {
    console.error("[pipeline] assessment/generate-ai:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/emails/draft — Deep Profile / CV outcome emails OR Practical invitations */
router.post("/:jobId/stage/:idx/emails/draft", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    const stage = pipeline.stages[idx];
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }

    if (stage.type === "practical") {
      const fe = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
      const nextStage = idx < pipeline.stages.length - 1 ? pipeline.stages[idx + 1] : undefined;

      // After shortlist is confirmed AND next stage is ai_interview → send outcome + interview invitation emails
      if (stage.status === "done" && nextStage?.type === "ai_interview" && (stage.shortlistedIds?.length || 0) > 0) {
        const poolIds = stage.candidateIds || [];
        if (!poolIds.length) {
          res.status(400).json({ success: false, error: "No candidates in the practical pool." });
          return;
        }
        const shortlistedIds = (stage.shortlistedIds || []).map(id => new mongoose.Types.ObjectId(String(id)));

        // Fetch interview sessions created at shortlist time
        const sessions = await InterviewSession.find({
          jobId: req.params.jobId,
          pipelineStageIndex: idx + 1,
          candidateId: { $in: shortlistedIds },
        }).lean();

        const candidateInterviewLinks: Record<string, string> = {};
        for (const s of sessions) {
          candidateInterviewLinks[String(s.candidateId)] = `${fe}/interview?token=${s.inviteToken}`;
        }

        const candidates = await Candidate.find({ _id: { $in: poolIds } });
        const drafts = await draftEmailsForStageOutcome(
          job, stage, idx, nextStage, nextStage.applicantComms,
          candidates, shortlistedIds, undefined, candidateInterviewLinks
        );
        res.json({
          success: true,
          data: {
            drafts,
            emailConfigured: isEmailConfigured(),
            nextStageName: nextStage.name,
            draftKind: "stage_outcome",
          },
        });
        return;
      }

      // Before shortlist: send practical assessment invitations to everyone in the pool
      const def = stage.assessmentDefinition;
      const hasAssessment = !!(def?.questions?.length || def?.sections?.length || def?.projectInstructions?.trim());
      if (!hasAssessment) {
        res.status(400).json({ success: false, error: "HR has not published the assessment template yet. Go to Jobs → Setup Assessment first." });
        return;
      }
      const poolIds = stage.candidateIds || [];
      if (!poolIds.length) {
        res.status(400).json({ success: false, error: "No candidates in the practical pool yet." });
        return;
      }
      const candidates = await Candidate.find({ _id: { $in: poolIds } });
      const internalBase = `${fe}/assessment`;
      const drafts = await draftPracticalInvitationEmails(job, stage, stage.applicantComms, candidates, internalBase);
      res.json({
        success: true,
        data: {
          drafts,
          emailConfigured: isEmailConfigured(),
          stageName: stage.name,
          draftKind: "practical_invite",
        },
      });
      return;
    }

    if (stage.type === "deep_review" || stage.type === "cv_screen") {
      if (stage.status !== "done") {
        res.status(400).json({ success: false, error: "Complete and confirm this stage before drafting outcome emails." });
        return;
      }
      const poolIds = stage.candidateIds || [];
      if (!poolIds.length) {
        res.status(400).json({ success: false, error: "No candidates in this stage pool." });
        return;
      }
      const candidates = await Candidate.find({ _id: { $in: poolIds } });
      const nextStage = idx < pipeline.stages.length - 1 ? pipeline.stages[idx + 1] : undefined;
      const nextComms = nextStage?.applicantComms;
      const fe = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
      const internalBase = `${fe}/assessment`;
      // cv_screen: shortlisted candidates proceed silently to deep review — only rejected need an email
      const regretOnly = stage.type === "cv_screen";
      const drafts = await draftEmailsForStageOutcome(
        job, stage, idx, nextStage, nextComms, candidates,
        (stage.shortlistedIds || []).map(id => new mongoose.Types.ObjectId(String(id))),
        internalBase, undefined, regretOnly
      );
      res.json({
        success: true,
        data: {
          drafts,
          emailConfigured: isEmailConfigured(),
          nextStageName: nextStage?.name,
          draftKind: "stage_outcome",
          regretOnly,
        },
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: "Email drafts are available for Initial CV / Deep Profile (shortlist vs regret) or Practical (exam invitations).",
    });
  } catch (err: any) {
    console.error("[pipeline] emails/draft:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/emails/send — same stages as draft */
router.post("/:jobId/stage/:idx/emails/send", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    const stage = pipeline.stages[idx];
    if (!["practical", "deep_review", "cv_screen"].includes(stage.type)) {
      res.status(400).json({
        success: false,
        error: "Sending is enabled for Practical, Deep Profile, or Initial CV stages only.",
      });
      return;
    }
    if (stage.type === "practical") {
      const def = stage.assessmentDefinition;
      const hasAssessment = !!(def?.questions?.length || def?.sections?.length || def?.projectInstructions?.trim());
      if (!hasAssessment) {
        res.status(400).json({ success: false, error: "HR has not published the assessment template yet. Go to Jobs → Setup Assessment first." });
        return;
      }
    }
    const poolSet = new Set((stage.candidateIds || []).map(id => String(id)));
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: "messages must be a non-empty array" });
      return;
    }

    const results: { candidateId: string; ok: boolean; simulated?: boolean; error?: string }[] = [];
    if (!stage.emailLog) pipeline.stages[idx].emailLog = [];

    for (const m of messages) {
      const candidateId = m?.candidateId ? String(m.candidateId) : "";
      const subject = m?.subject ? String(m.subject).trim() : "";
      const body = m?.body ? String(m.body).trim() : "";
      const kind = m?.kind === "regret" ? "regret" : "advance";
      if (!candidateId || !subject || !body) {
        results.push({ candidateId: candidateId || "?", ok: false, error: "missing candidateId, subject, or body" });
        continue;
      }
      if (!poolSet.has(candidateId)) {
        results.push({ candidateId, ok: false, error: "candidate not in this stage pool" });
        continue;
      }
      const cand = await Candidate.findById(candidateId);
      if (!cand?.email) {
        results.push({ candidateId, ok: false, error: "candidate email missing" });
        continue;
      }
      const sendRes = await sendApplicantEmail(cand.email, subject, body);
      results.push({
        candidateId,
        ok: sendRes.ok,
        simulated: sendRes.simulated,
        error: sendRes.error,
      });
      if (sendRes.ok) {
        pipeline.stages[idx].emailLog!.push({
          candidateId: new mongoose.Types.ObjectId(candidateId),
          kind,
          sentAt: new Date(),
          subject,
          to: cand.email,
        });
      }
    }

    await pipeline.save();
    res.json({ success: true, data: { results, pipeline } });
  } catch (err: any) {
    console.error("[pipeline] emails/send:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /pipeline/:jobId/stage/:idx/practical/submissions — list practical submissions + grades */
router.get("/:jobId/stage/:idx/practical/submissions", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    if (pipeline.stages[idx].type !== "practical") {
      res.status(400).json({ success: false, error: "Not a practical stage." });
      return;
    }
    const subs = await PracticalSubmission.find({ jobId: req.params.jobId, pipelineStageIndex: idx })
      .populate("candidateId", "firstName lastName email")
      .sort({ compareRank: 1, score: -1 })
      .lean();
    res.json({ success: true, data: subs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/practical/grade-all — AI grade all ungraded submissions, then compare & rank */
router.post("/:jobId/stage/:idx/practical/grade-all", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" });
      return;
    }
    if (pipeline.stages[idx].type !== "practical") {
      res.status(400).json({ success: false, error: "Not a practical stage." });
      return;
    }
    const { graded } = await gradeAllPending(req.params.jobId, idx);
    const subs = await PracticalSubmission.find({ jobId: req.params.jobId, pipelineStageIndex: idx })
      .populate("candidateId", "firstName lastName email")
      .sort({ compareRank: 1, score: -1 })
      .lean();
    res.json({ success: true, data: { graded, submissions: subs } });
  } catch (err: any) {
    console.error("[pipeline] practical/grade-all:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/practical/grade-one/:submissionId — grade a single submission */
router.post("/:jobId/stage/:idx/practical/grade-one/:submissionId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sub = await PracticalSubmission.findById(req.params.submissionId);
    if (!sub) { res.status(404).json({ success: false, error: "Submission not found" }); return; }
    const { score, feedback } = await gradeSubmission(sub);
    sub.score = score; sub.feedback = feedback;
    await sub.save();
    const idx = parseInt(req.params.idx);
    await compareAndRankSubmissions(req.params.jobId, idx);
    const subs = await PracticalSubmission.find({ jobId: req.params.jobId, pipelineStageIndex: idx })
      .populate("candidateId", "firstName lastName email")
      .sort({ compareRank: 1, score: -1 }).lean();
    res.json({ success: true, data: { graded: 1, submissions: subs } });
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isGeminiHighDemand = /high demand|service unavailable|503/i.test(msg);
    res.status(isGeminiHighDemand ? 503 : 500).json({
      success: false,
      error: isGeminiHighDemand
        ? "AI grading is temporarily busy (Gemini high demand). Please try again in a minute."
        : msg,
    });
  }
});

/* ══════════════════════════════════════════════════════════
   ROLLBACK — revert to a specific stage and redo from there
   ══════════════════════════════════════════════════════════ */

/**
 * POST /pipeline/:jobId/stage/:idx/rollback
 *
 * Rolls the pipeline back to stage :idx.
 * - Stages from :idx onward are reset to "pending"
 * - The target stage's candidateIds are repopulated from the previous stage's shortlist
 * - Candidate rejection flags for stages >= :idx are cleared
 * - PracticalSubmissions and InterviewSessions for affected stages are deleted
 */
router.post("/:jobId/stage/:idx/rollback", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) { res.status(404).json({ success: false, error: "Pipeline not found." }); return; }

    const targetIdx = parseInt(req.params.idx);
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index." }); return;
    }

    // Must be rolling back — can only rollback to a stage that is at or before the current stage
    if (targetIdx >= pipeline.currentStageIndex && pipeline.stages[targetIdx].status === "pending") {
      res.status(400).json({ success: false, error: "Stage has not been started yet. Nothing to roll back." }); return;
    }

    // Determine which stage types are being rolled back (for data cleanup)
    const rolledBackTypes = pipeline.stages.slice(targetIdx).map(s => s.type);
    const rollsBackPractical = rolledBackTypes.includes("practical");
    const rollsBackInterview = rolledBackTypes.includes("ai_interview");

    // ── 1. Collect all candidate IDs that were in rolled-back stages ──
    const affectedCandidateIds = new Set<string>();
    for (let i = targetIdx; i < pipeline.stages.length; i++) {
      (pipeline.stages[i].candidateIds || []).forEach(id => affectedCandidateIds.add(String(id)));
      (pipeline.stages[i].shortlistedIds || []).forEach(id => affectedCandidateIds.add(String(id)));
    }

    // ── 2. Determine the candidate pool for the target stage ──
    let poolForTarget: mongoose.Types.ObjectId[] = [];
    if (targetIdx === 0) {
      // First stage: all candidates for the job
      const allCands = await Candidate.find({ jobId: req.params.jobId }).select("_id").lean();
      poolForTarget = allCands.map(c => c._id as mongoose.Types.ObjectId);
    } else {
      // Target stage: use shortlistedIds of the previous stage
      poolForTarget = (pipeline.stages[targetIdx - 1].shortlistedIds || []) as mongoose.Types.ObjectId[];
    }

    // ── 3. Reset stages from targetIdx onward ──
    for (let i = targetIdx; i < pipeline.stages.length; i++) {
      pipeline.stages[i].status = "pending";
      pipeline.stages[i].shortlistedIds = [];
      pipeline.stages[i].candidateIds = i === targetIdx ? poolForTarget : [];
      pipeline.stages[i].ranAt = undefined;
    }
    pipeline.currentStageIndex = targetIdx;
    pipeline.markModified("stages");
    await pipeline.save();

    // ── 4. Clean up dependent data ──
    if (rollsBackPractical) {
      await PracticalSubmission.deleteMany({ jobId: req.params.jobId });
    }
    if (rollsBackInterview) {
      await InterviewSession.deleteMany({ jobId: req.params.jobId });
    }

    // Delete ScreeningResults for affected candidates so re-screening produces fresh results
    if (affectedCandidateIds.size > 0) {
      await ScreeningResult.deleteMany({
        jobId: req.params.jobId,
        candidateId: { $in: Array.from(affectedCandidateIds) },
      });
    }

    // ── 5. Reset candidate statuses ──
    // Un-reject candidates that were rejected at stages >= targetIdx
    await Candidate.updateMany(
      { jobId: req.params.jobId, rejectedAtStageIndex: { $gte: targetIdx } },
      { $set: { status: "shortlisted" }, $unset: { rejectedAtStageIndex: 1, rejectedAtStageName: 1 } }
    );
    // Also un-shortlist candidates that were "shortlisted" at stages we're rolling back
    // (treat them as screened so they can be re-evaluated cleanly)
    if (affectedCandidateIds.size > 0) {
      await Candidate.updateMany(
        { jobId: req.params.jobId, _id: { $in: Array.from(affectedCandidateIds) }, status: "shortlisted" },
        { $set: { status: "screened" } }
      );
    }

    res.json({
      success: true,
      message: `Pipeline rolled back to "${pipeline.stages[targetIdx].name}". ${poolForTarget.length} candidates restored to this stage.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE /pipeline/:jobId  — reset pipeline */
router.delete("/:jobId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await PracticalSubmission.deleteMany({ jobId: req.params.jobId });
    await InterviewSession.deleteMany({ jobId: req.params.jobId });
    await Pipeline.deleteOne({ jobId: req.params.jobId });
    await Candidate.updateMany(
      { jobId: req.params.jobId },
      { $unset: { rejectedAtStageIndex: 1, rejectedAtStageName: 1 } }
    );
    await Candidate.updateMany(
      { jobId: req.params.jobId, status: "rejected" },
      { $set: { status: "screened" } }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   AI INTERVIEW — HR management routes
   ══════════════════════════════════════════════════════════ */

/* POST /pipeline/:jobId/stage/:idx/interview/invite
   Generate tokens, pre-load AI questions, send invitation emails */
router.post("/:jobId/stage/:idx/interview/invite", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) { res.status(404).json({ success: false, error: "Pipeline not found" }); return; }

    const idx = parseInt(req.params.idx);
    if (isNaN(idx) || idx < 0 || idx >= pipeline.stages.length) {
      res.status(400).json({ success: false, error: "Invalid stage index" }); return;
    }
    if (pipeline.stages[idx].type !== "ai_interview") {
      res.status(400).json({ success: false, error: "Stage is not an AI interview stage." }); return;
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }

    // Window defaults: now → +7 days (or from request body)
    const windowStart = req.body?.windowStart ? new Date(req.body.windowStart) : new Date();
    const windowEnd = req.body?.windowEnd
      ? new Date(req.body.windowEnd)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Candidates to invite: shortlistedIds from previous stage, or from candidateIds of this stage
    const prevShortlisted: mongoose.Types.ObjectId[] = idx > 0
      ? (pipeline.stages[idx - 1].shortlistedIds as mongoose.Types.ObjectId[])
      : [];
    const toInvite = prevShortlisted.length ? prevShortlisted : pipeline.stages[idx].candidateIds as mongoose.Types.ObjectId[];

    if (!toInvite.length) {
      res.status(400).json({ success: false, error: "No candidates to invite. Shortlist candidates from the previous stage first." });
      return;
    }

    // Pre-generate interview questions once for this job (shared across all candidates)
    const questions = await generateInterviewQuestions(job);

    const fe = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const results: Array<{ candidateId: string; name: string; email: string; token: string; link: string }> = [];
    const emailErrors: string[] = [];

    for (const candidateId of toInvite) {
      const cand = await Candidate.findById(candidateId).select("name email").lean() as { _id: any; name: string; email: string } | null;
      if (!cand) continue;

      // Upsert session — one per candidate per stage
      let session = await InterviewSession.findOne({
        jobId: job._id,
        candidateId,
        pipelineStageIndex: idx,
      });

      if (!session || session.status === "expired") {
        const token = crypto.randomBytes(24).toString("hex");
        session = await InterviewSession.create({
          jobId: job._id,
          candidateId,
          pipelineStageIndex: idx,
          inviteToken: token,
          status: "pending",
          windowStart,
          windowEnd,
          interviewQuestions: questions,
        });
      } else {
        // Refresh window if re-inviting
        session.windowStart = windowStart;
        session.windowEnd = windowEnd;
        session.interviewQuestions = questions;
        if (session.status !== "completed") session.status = "pending";
        await session.save();
      }

      const link = `${fe}/interview?token=${session.inviteToken}`;

      // Send invitation email
      const emailBody = `Dear ${cand.name},\n\nCongratulations! You have been shortlisted for the AI Interview stage for the ${job.title} position.\n\nYour interview is available at the link below. You can complete it anytime between ${windowStart.toLocaleDateString()} and ${windowEnd.toLocaleDateString()}.\n\nInterview Link: ${link}\n\nInstructions:\n- Find a quiet place with good lighting.\n- Allow camera and microphone access.\n- The interview takes approximately 15–20 minutes.\n- Speak clearly and take your time with each answer.\n\nBest of luck!\n\nUmuranga Hiring Team`;

      try {
        await sendApplicantEmail(cand.email, `AI Interview Invitation — ${job.title}`, emailBody);
      } catch (e: any) {
        emailErrors.push(`${cand.email}: ${e.message}`);
      }

      results.push({ candidateId: String(candidateId), name: cand.name, email: cand.email, token: session.inviteToken, link });
    }

    // Update stage candidateIds
    pipeline.stages[idx].candidateIds = toInvite as any;
    pipeline.markModified("stages");
    await pipeline.save();

    res.json({
      success: true,
      data: { invited: results.length, results, emailErrors },
    });
  } catch (err: any) {
    console.error("[pipeline] interview/invite:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /pipeline/:jobId/stage/:idx/interview/sessions — list sessions + scores */
router.get("/:jobId/stage/:idx/interview/sessions", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const idx = parseInt(req.params.idx);
    const sessions = await InterviewSession.find({
      jobId: req.params.jobId,
      pipelineStageIndex: idx,
    })
      .populate<{ candidateId: { name: string; email: string } }>("candidateId", "name email")
      .lean();

    const data = sessions.map(s => ({
      _id: s._id,
      candidate: s.candidateId,
      status: s.status,
      windowStart: s.windowStart,
      windowEnd: s.windowEnd,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      score: s.score,
      transcript: s.transcript,
      hasRecording: !!s.recordingStoredName,
      inviteToken: s.inviteToken,
    }));

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /pipeline/:jobId/stage/:idx/interview/sessions/:sessionId/recording — serve video */
router.get("/:jobId/stage/:idx/interview/sessions/:sessionId/recording", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await InterviewSession.findOne({
      _id: req.params.sessionId,
      jobId: req.params.jobId,
    }).lean();

    if (!session?.recordingStoredName) {
      res.status(404).json({ success: false, error: "No recording found." }); return;
    }

    const filePath = path.join(
      process.cwd(), "uploads", "interview-recordings",
      req.params.jobId, session.recordingStoredName
    );
    res.setHeader("Content-Type", "video/webm");
    res.setHeader("Content-Disposition", `inline; filename="${session.recordingStoredName}"`);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /pipeline/:jobId/stage/:idx/interview/shortlist — mark top candidates */
router.post("/:jobId/stage/:idx/interview/shortlist", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) { res.status(404).json({ success: false, error: "Pipeline not found" }); return; }
    const idx = parseInt(req.params.idx);
    const ids: string[] = Array.isArray(req.body?.candidateIds) ? req.body.candidateIds : [];
    pipeline.stages[idx].shortlistedIds = ids.map(id => new mongoose.Types.ObjectId(id)) as any;
    pipeline.stages[idx].status = "done";
    pipeline.markModified("stages");
    await pipeline.save();
    res.json({ success: true, data: pipeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   FINAL SELECTION — AI synthesises all pipeline stages for a candidate pool
   ══════════════════════════════════════════════════════════ */

/**
 * POST /pipeline/:jobId/final-selection
 * Body: { candidateIds?: string[] }  — if omitted, uses all shortlisted from last done stage
 *
 * For each candidate, gathers:
 *  - CV screening score / explanation
 *  - Deep review score
 *  - Practical assessment score + feedback
 *  - AI interview score + feedback
 * Then asks Gemini to synthesise a final recommendation with an overall conclusion.
 */
router.post("/:jobId/final-selection", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const pipeline = await Pipeline.findOne({ jobId });
    const job = await Job.findById(jobId);
    if (!pipeline || !job) { res.status(404).json({ success: false, error: "Pipeline or job not found." }); return; }

    // Determine candidate pool — explicit list or last done stage's shortlisted
    let candidateIds: mongoose.Types.ObjectId[] = [];
    if (Array.isArray(req.body?.candidateIds) && req.body.candidateIds.length > 0) {
      candidateIds = req.body.candidateIds.map((id: string) => new mongoose.Types.ObjectId(id));
    } else {
      // Walk backward to find last stage with shortlisted candidates
      const doneStages = pipeline.stages.filter(s => s.status === "done" && (s.shortlistedIds?.length || 0) > 0);
      const lastDone = doneStages[doneStages.length - 1];
      candidateIds = (lastDone?.shortlistedIds as mongoose.Types.ObjectId[]) || [];
    }

    if (candidateIds.length === 0) {
      res.status(400).json({ success: false, error: "No candidates in the pool. Complete at least one pipeline stage first." });
      return;
    }

    const results: Array<{
      candidateId: string;
      candidateName: string;
      email: string;
      stagesData: string;
      finalScore: number;
      recommendation: string;
      conclusion: string;
      strengths: string[];
      concerns: string[];
      hiringDecision: "hire" | "maybe" | "pass";
    }> = [];

    for (const cid of candidateIds) {
      const candidate = await Candidate.findById(cid).lean();
      if (!candidate) continue;
      const candName = `${(candidate as any).firstName || ""} ${(candidate as any).lastName || ""}`.trim();
      const candEmail = (candidate as any).email || "";

      // Gather all stage data
      const stageSummaries: string[] = [];

      // CV screening / deep review results
      const screenResult = await ScreeningResult.findOne({ jobId, candidateId: cid }).lean();
      if (screenResult) {
        stageSummaries.push(
          `CV/Deep Screening:\n  Overall score: ${(screenResult as any).overallScore}/100\n  Recommendation: ${(screenResult as any).recommendation}\n  Strengths: ${((screenResult as any).strengths || []).join(", ")}\n  Gaps: ${((screenResult as any).gaps || []).join(", ")}\n  Explanation: ${String((screenResult as any).aiExplanation || "").slice(0, 600)}`
        );
      }

      // Practical assessment
      const practical = await PracticalSubmission.findOne({ jobId, candidateId: cid, score: { $exists: true, $ne: null } })
        .sort({ createdAt: -1 }).lean();
      if (practical) {
        stageSummaries.push(
          `Practical Assessment:\n  Score: ${(practical as any).score}/100\n  Feedback: ${String((practical as any).feedback || "").slice(0, 600)}\n  Rank (within cohort): ${(practical as any).compareRank || "N/A"}`
        );
      }

      // AI interview
      const interview = await InterviewSession.findOne({ jobId, candidateId: cid, status: "completed" })
        .sort({ completedAt: -1 }).lean();
      if (interview) {
        const sc = (interview as any).score;
        if (sc) {
          stageSummaries.push(
            `AI Video Interview:\n  Overall: ${sc.overall}/100 | Confidence: ${sc.confidence} | Communication: ${sc.communication} | Accuracy: ${sc.accuracy} | Attitude: ${sc.attitude}\n  Feedback: ${String(sc.feedback || "").slice(0, 600)}\n  Strengths: ${(sc.strengths || []).join(", ")}\n  Improvements: ${(sc.improvements || []).join(", ")}`
          );
        } else {
          stageSummaries.push(`AI Video Interview: Completed (score not yet available)`);
        }
      }

      if (stageSummaries.length === 0) {
        results.push({
          candidateId: String(cid),
          candidateName: candName,
          email: candEmail,
          stagesData: "No stage data available",
          finalScore: 0,
          recommendation: "Insufficient data",
          conclusion: "This candidate has no recorded stage data to evaluate.",
          strengths: [],
          concerns: ["No data from pipeline stages"],
          hiringDecision: "pass",
        });
        continue;
      }

      const stagesData = stageSummaries.join("\n\n");
      const prompt = `You are a senior hiring manager making the final hiring decision for: ${job.title} (${(job as any).department || "N/A"}).

Required skills: ${((job as any).requiredSkills || []).join(", ")}
Experience required: ${(job as any).experienceYears || 0}+ years

Candidate: ${candName}

Performance across all hiring pipeline stages:
${stagesData}

Synthesise ALL the above data holistically. This is the final decision — consider the complete picture.

Return ONLY valid JSON:
{
  "finalScore": <number 0-100 — weighted holistic score across all stages>,
  "recommendation": "<one clear sentence summarising the candidate's suitability>",
  "conclusion": "<2-3 sentences: holistic synthesis — what stands out across ALL stages, patterns noticed, why they should/should not be hired>",
  "strengths": ["<key strength 1>", "<key strength 2>", "<key strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "hiringDecision": "hire"|"maybe"|"pass"
}`;

      try {
        const raw = await geminiChatText(prompt, { maxRetries: 2, maxOutputTokens: 800 });
        const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
        results.push({
          candidateId: String(cid),
          candidateName: candName,
          email: candEmail,
          stagesData,
          finalScore: Math.max(0, Math.min(100, Number(parsed.finalScore) || 0)),
          recommendation: String(parsed.recommendation || ""),
          conclusion: String(parsed.conclusion || ""),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
          concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
          hiringDecision: ["hire", "maybe", "pass"].includes(parsed.hiringDecision) ? parsed.hiringDecision : "maybe",
        });
      } catch {
        results.push({
          candidateId: String(cid),
          candidateName: candName,
          email: candEmail,
          stagesData,
          finalScore: 0,
          recommendation: "AI synthesis failed — review manually.",
          conclusion: "Could not generate AI conclusion for this candidate.",
          strengths: [],
          concerns: ["AI synthesis error"],
          hiringDecision: "maybe",
        });
      }
    }

    // Sort by finalScore descending
    results.sort((a, b) => b.finalScore - a.finalScore);

    res.json({ success: true, data: { results, total: results.length } });
  } catch (err: any) {
    console.error("[pipeline] final-selection:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
