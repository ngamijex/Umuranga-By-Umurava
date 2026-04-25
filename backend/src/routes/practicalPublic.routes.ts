import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { Pipeline } from "../models/Pipeline.model";
import { Job } from "../models/Job.model";
import { Candidate } from "../models/Candidate.model";
import { PracticalSubmission } from "../models/PracticalSubmission.model";
import { gradeSubmission, compareAndRankSubmissions } from "../services/practicalAssessment.service";
import type { IPracticalAssessmentDefinition } from "../models/assessmentDefinition";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 15 },
});

function findPracticalStageIndex(stages: { type: string }[]): number {
  return stages.findIndex(s => s.type === "practical");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "file";
}

/* GET /public/practical/:jobId/info?email= */
router.get("/:jobId/info", async (req: Request, res: Response): Promise<void> => {
  try {
    // Prevent caching - always fresh data
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    const email = String(req.query.email || "")
      .toLowerCase()
      .trim();
    if (!email) {
      res.status(400).json({ success: false, error: "email query required" });
      return;
    }
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = findPracticalStageIndex(pipeline.stages as { type: string }[]);
    if (idx < 0) {
      res.status(400).json({ success: false, error: "No practical stage in pipeline." });
      return;
    }
    const stage = pipeline.stages[idx];

    // Auto-heal: if practical candidateIds is empty, seed it from the previous stage's shortlistedIds
    if (!(stage.candidateIds || []).length && idx > 0) {
      const prevShortlisted = pipeline.stages[idx - 1].shortlistedIds || [];
      if (prevShortlisted.length) {
        pipeline.stages[idx].candidateIds = prevShortlisted as any;
        await pipeline.save();
      }
    }

    const cand = await Candidate.findOne({ jobId: req.params.jobId, email }).select("_id");
    if (!cand) {
      res.status(404).json({ success: false, error: "No application with this email for this job." });
      return;
    }
    const inPool = (stage.candidateIds || []).some(id => String(id) === String(cand._id));
    if (!inPool) {
      res.status(403).json({ success: false, error: "You are not in the pool for this practical assessment." });
      return;
    }

    // Auto-sync from job if stage has no assessment definition
    let def = stage.assessmentDefinition as IPracticalAssessmentDefinition | undefined;
    const jobTpl = job.practicalAssessmentTemplate as IPracticalAssessmentDefinition | undefined;
    
    const hasJobContent = !!(jobTpl?.questions?.length || jobTpl?.sections?.length || jobTpl?.projectInstructions?.trim());
    const hasStageContent = !!(def?.questions?.length || def?.sections?.length || def?.projectInstructions?.trim());
    
    if (!hasStageContent && hasJobContent) {
      pipeline.stages[idx].assessmentDefinition = jobTpl;
      pipeline.markModified("stages");
      await pipeline.save();
      def = jobTpl;
    }

    // Verify assessment is published before allowing access
    const hasAssessment = !!(def?.questions?.length || def?.sections?.length || def?.projectInstructions?.trim());
    if (!hasAssessment) {
      res.status(403).json({ success: false, error: "Assessment not available yet. HR has not published the exam." });
      return;
    }

    const comms = stage.applicantComms;
    const sub = await PracticalSubmission.findOne({
      jobId: req.params.jobId,
      candidateId: cand._id,
      pipelineStageIndex: idx,
    }).lean();

    const fe = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const defaultLink = `${fe}/assessment?jobId=${encodeURIComponent(String(req.params.jobId))}&email=${encodeURIComponent(email)}`;

    const jobResources = (job.practicalAssessmentTemplate as any)?.resources || [];

    // Convert Mongoose subdocument to a plain JS object so nested arrays (sections, options, etc.)
    // are fully serialized. Spreading a Mongoose document loses sub-array contents.
    const plainDef: IPracticalAssessmentDefinition | null = def
      ? JSON.parse(JSON.stringify(def))
      : null;

    const defHasContent = !!(
      plainDef?.questions?.length ||
      plainDef?.sections?.length ||
      plainDef?.projectInstructions?.trim()
    );
    const effectiveDef = defHasContent
      ? { ...plainDef, resources: plainDef?.resources?.length ? plainDef.resources : jobResources }
      : null;

    const responsePayload = {
      success: true,
      data: {
        jobTitle: job.title,
        stageName: stage.name,
        assessmentUrl: comms?.assessmentUrl?.trim() || defaultLink,
        assessmentFormat: comms?.assessmentFormat || "",
        submissionDeadlineAt: comms?.submissionDeadlineAt || "",
        extraInstructions: comms?.extraInstructions || "",
        assessmentDefinition: effectiveDef || plainDef || null,
        resources: jobResources,
        submitted: !!sub,
        submittedAt: sub?.submittedAt,
      },
    };
    
    res.json(responsePayload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /public/practical/:jobId/resources/:storedName — download HR-uploaded resource */
router.get("/:jobId/resources/:storedName", async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.jobId).lean();
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    const tpl = (job as any).practicalAssessmentTemplate;
    const resources: Array<{ storedName: string; name: string; mimeType: string; csvContent?: string }> = tpl?.resources || [];
    const meta = resources.find(r => r.storedName === req.params.storedName);
    if (!meta) { res.status(404).json({ success: false, error: "Resource not found" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${meta.name.replace(/"/g, "_")}"`);
    if (meta.mimeType) res.setHeader("Content-Type", meta.mimeType);
    // Prefer serving content stored in DB (survives server restarts on Render/cloud)
    if (meta.csvContent) {
      const isBase64 = meta.mimeType && meta.mimeType.includes("spreadsheet");
      const buf = isBase64
        ? Buffer.from(meta.csvContent, "base64")
        : Buffer.from(meta.csvContent, "utf-8");
      res.send(buf);
      return;
    }
    // Fall back to disk for manually uploaded files
    const filePath = path.join(process.cwd(), "uploads", "assessment-resources", req.params.jobId, req.params.storedName);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /public/practical/:jobId/submit — multipart: email, answersJson, files */
router.post("/:jobId/submit", upload.any(), async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    let textAnswers: Record<string, string> = {};
    try {
      const raw = req.body?.answersJson;
      if (typeof raw === "string" && raw.trim()) {
        textAnswers = JSON.parse(raw) as Record<string, string>;
      }
    } catch {
      res.status(400).json({ success: false, error: "answersJson must be valid JSON object." });
      return;
    }
    if (!email) {
      res.status(400).json({ success: false, error: "email required" });
      return;
    }

    const pipeline = await Pipeline.findOne({ jobId: req.params.jobId });
    if (!pipeline) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }
    const idx = findPracticalStageIndex(pipeline.stages as { type: string }[]);
    if (idx < 0) {
      res.status(400).json({ success: false, error: "No practical stage." });
      return;
    }
    const stage = pipeline.stages[idx];
    const comms = stage.applicantComms;
    const deadline = comms?.submissionDeadlineAt ? new Date(comms.submissionDeadlineAt) : null;
    if (deadline && !Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
      res.status(400).json({ success: false, error: "The submission deadline has passed." });
      return;
    }

    const cand = await Candidate.findOne({ jobId: req.params.jobId, email });
    if (!cand) {
      res.status(404).json({ success: false, error: "No application with this email." });
      return;
    }
    const inPool = (stage.candidateIds || []).some(id => String(id) === String(cand._id));
    if (!inPool) {
      res.status(403).json({ success: false, error: "You are not invited to this practical assessment." });
      return;
    }

    // Verify assessment is published before accepting submissions
    const def = stage.assessmentDefinition as IPracticalAssessmentDefinition | undefined;
    const hasAssessment = !!(def?.questions?.length || def?.sections?.length || def?.projectInstructions?.trim());
    if (!hasAssessment) {
      res.status(403).json({ success: false, error: "Assessment not available yet. HR has not published the exam." });
      return;
    }

    const uploadRoot = path.join(process.cwd(), "uploads", "practical", String(req.params.jobId), String(cand._id));
    await fs.mkdir(uploadRoot, { recursive: true });

    const fileMeta: Array<{ questionId: string; originalName: string; storedPath: string; mimeType: string }> = [];
    const files = (req.files as Express.Multer.File[]) || [];
    const maxMb = stage.assessmentDefinition?.maxFileMb || 15;

    for (const f of files) {
      const qid = String(f.fieldname || "file").replace(/^file_/, "") || "file";
      if (f.size > maxMb * 1024 * 1024) {
        res.status(400).json({ success: false, error: `File ${f.originalname} exceeds ${maxMb} MB limit.` });
        return;
      }
      const safe = `${Date.now()}-${sanitizeFilename(f.originalname)}`;
      const dest = path.join(uploadRoot, safe);
      await fs.writeFile(dest, f.buffer);
      fileMeta.push({
        questionId: qid,
        originalName: f.originalname,
        storedPath: dest,
        mimeType: f.mimetype,
      });
    }

    const hasText = Object.keys(textAnswers).some(k => String(textAnswers[k] || "").trim());
    if (!hasText && fileMeta.length === 0) {
      res.status(400).json({ success: false, error: "Provide answers and/or upload files." });
      return;
    }

    const payload = JSON.stringify({
      version: 2,
      textAnswers,
      files: fileMeta,
    });

    const sub = await PracticalSubmission.findOneAndUpdate(
      { jobId: new mongoose.Types.ObjectId(req.params.jobId), candidateId: cand._id, pipelineStageIndex: idx },
      {
        $set: { answers: payload, submittedAt: new Date() },
        $unset: { score: 1, feedback: 1, compareRank: 1, comparisonSummary: 1 },
      },
      { upsert: true, new: true }
    );

    // Trigger AI grading asynchronously so the candidate gets immediate confirmation
    if (sub) {
      gradeSubmission(sub)
        .then(async ({ score, feedback }) => {
          sub.score = score;
          sub.feedback = feedback;
          await sub.save();
          await compareAndRankSubmissions(req.params.jobId, idx);
        })
        .catch(e => console.error("[practical] auto-grade failed:", e?.message));
    }

    res.json({ success: true, message: "Submission received. AI grading is in progress." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
