import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { Router, Response } from "express";
import multer from "multer";
import { protect, AuthRequest } from "../middleware/auth.middleware";
import { Job } from "../models/Job.model";
import { Pipeline } from "../models/Pipeline.model";
import { Candidate } from "../models/Candidate.model";
import { ScreeningResult } from "../models/ScreeningResult.model";
import type { IPracticalAssessmentDefinition, IAssessmentResource } from "../models/assessmentDefinition";
import { aiGeneratePracticalAssessment, aiGenerateDatasets } from "../services/practicalAssessmentBuilder.service";
import fsSync from "fs";

const resourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "file";
}

const router = Router();
router.use(protect);

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find({ createdBy: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    const candidateCount = await Candidate.countDocuments({ jobId: req.params.id });
    const screenedCount = await ScreeningResult.countDocuments({ jobId: req.params.id });
    res.json({ success: true, data: { ...job.toObject(), candidateCount, screenedCount } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Use findOne + save so we can preserve Mixed-type resources when the caller
    // doesn't send them (e.g. savePracticalTemplate only sends form fields).
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }

    const { practicalAssessmentTemplate: incomingTpl, ...otherFields } = req.body;

    // Apply scalar / top-level fields
    Object.assign(job, otherFields);

    // Merge template while preserving resources that may already be stored
    if (incomingTpl !== undefined) {
      const existingResources: IAssessmentResource[] = (job.practicalAssessmentTemplate as any)?.resources || [];
      job.practicalAssessmentTemplate = {
        ...incomingTpl,
        // Keep existing resources unless the caller explicitly supplies a new array
        resources: Array.isArray(incomingTpl.resources) ? incomingTpl.resources : existingResources,
      } as any;
      job.markModified("practicalAssessmentTemplate");
    }

    await job.save();

    const tpl = job.practicalAssessmentTemplate as IPracticalAssessmentDefinition | undefined;
    const hasSections = Array.isArray((tpl as any)?.sections) && (tpl as any).sections.length > 0;
    const hasQuestions = Array.isArray(tpl?.questions) && tpl.questions.length > 0;
    const hasProject = typeof tpl?.projectInstructions === "string" && tpl.projectInstructions.trim().length > 0;
    const hasTpl = hasSections || hasQuestions || hasProject;
    if (hasTpl) {
      const pipeline = await Pipeline.findOne({ jobId: job._id });
      if (pipeline) {
        const pIdx = pipeline.stages.findIndex(s => s.type === "practical");
        if (pIdx >= 0) {
          pipeline.stages[pIdx].assessmentDefinition = tpl as IPracticalAssessmentDefinition;
          pipeline.markModified("stages");
          await pipeline.save();
        }
      }
    }

    res.json({ success: true, data: job });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    res.json({ success: true, message: "Job deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /jobs/:id/generate-assessment — AI draft assessment from job description */
router.post("/:id/generate-assessment", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    const mode = req.body?.mode === "project" ? "project" : "form";
    const hint = typeof req.body?.hint === "string" ? req.body.hint : "";

    // For project mode: generate datasets FIRST so the brief can reference exact filenames/columns
    let datasetMeta: import("../services/practicalAssessmentBuilder.service").IDatasetMeta[] = [];
    let newResources: IAssessmentResource[] = [];

    if (mode === "project") {
      try {
        const datasets = await aiGenerateDatasets(job, "");   // seed from job description alone
        const resourcesDir = path.join(process.cwd(), "uploads", "assessment-resources", String(job._id));
        fsSync.mkdirSync(resourcesDir, { recursive: true });

        for (const ds of datasets) {
          const ts = Date.now();

          const csvStoredName = `${ts}_${ds.filename}`;
          fsSync.writeFileSync(path.join(resourcesDir, csvStoredName), ds.csvContent, "utf-8");
          newResources.push({
            id: csvStoredName,
            name: ds.filename,
            storedName: csvStoredName,
            mimeType: "text/csv",
            sizeBytes: Buffer.byteLength(ds.csvContent, "utf-8"),
          });

          if (ds.xlsxBuffer) {
            const xlsxName = ds.filename.replace(/\.csv$/i, ".xlsx");
            const xlsxStoredName = `${ts + 1}_${xlsxName}`;
            fsSync.writeFileSync(path.join(resourcesDir, xlsxStoredName), ds.xlsxBuffer);
            newResources.push({
              id: xlsxStoredName,
              name: xlsxName,
              storedName: xlsxStoredName,
              mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              sizeBytes: ds.xlsxBuffer.length,
            });
          }

          // Collect metadata so the brief can reference exact columns
          datasetMeta.push({ filename: ds.filename, description: ds.description, columns: ds.headers });
        }
      } catch (datasetErr: any) {
        console.warn("[jobs] dataset generation failed:", datasetErr?.message);
      }
    }

    // Generate the assessment structure — pass dataset metadata for a richer, dataset-aware brief
    const def = await aiGeneratePracticalAssessment(job, mode, hint, datasetMeta.length ? datasetMeta : undefined);

    // Attach generated resources to the definition and persist to the job
    if (newResources.length) {
      const existing = (job.practicalAssessmentTemplate as any) || {};
      const existingResources: IAssessmentResource[] = Array.isArray(existing.resources)
        ? existing.resources : [];

      (job as any).practicalAssessmentTemplate = {
        ...existing,
        resources: [...existingResources, ...newResources],
      };
      job.markModified("practicalAssessmentTemplate");
      await job.save();

      def.resources = newResources;
    }

    res.json({ success: true, data: { assessmentDefinition: def, job } });
  } catch (err: any) {
    console.error("[jobs] generate-assessment:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /jobs/:id/assessment-resources — upload resource files */
router.post("/:id/assessment-resources", resourceUpload.any(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }

    const uploadDir = path.join(process.cwd(), "uploads", "assessment-resources", String(job._id));
    await fs.mkdir(uploadDir, { recursive: true });

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) { res.status(400).json({ success: false, error: "No files received" }); return; }

    const tpl = (job.practicalAssessmentTemplate || {}) as IPracticalAssessmentDefinition;
    const existing: IAssessmentResource[] = (tpl as any).resources || [];

    for (const f of files) {
      const storedName = `${Date.now()}-${sanitizeFilename(f.originalname)}`;
      await fs.writeFile(path.join(uploadDir, storedName), f.buffer);
      existing.push({
        id: storedName,
        name: f.originalname,
        storedName,
        mimeType: f.mimetype || "",
        sizeBytes: f.size,
      });
    }

    const updatedTpl = { ...tpl, resources: existing };
    job.practicalAssessmentTemplate = updatedTpl as any;
    job.markModified("practicalAssessmentTemplate");
    await job.save();

    const pipeline = await Pipeline.findOne({ jobId: job._id });
    if (pipeline) {
      const pIdx = pipeline.stages.findIndex(s => s.type === "practical");
      if (pIdx >= 0 && pipeline.stages[pIdx].assessmentDefinition) {
        pipeline.stages[pIdx].assessmentDefinition!.resources = existing;
        pipeline.markModified(`stages`);
        await pipeline.save();
      }
    }

    res.json({ success: true, data: job });
  } catch (err: any) {
    console.error("[jobs] assessment-resources upload:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE /jobs/:id/assessment-resources/:storedName — remove a resource */
router.delete("/:id/assessment-resources/:storedName", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }

    const tpl = (job.practicalAssessmentTemplate || {}) as IPracticalAssessmentDefinition;
    const existing: IAssessmentResource[] = (tpl as any).resources || [];
    const filtered = existing.filter(r => r.storedName !== req.params.storedName);

    const filePath = path.join(process.cwd(), "uploads", "assessment-resources", String(job._id), req.params.storedName);
    if (existsSync(filePath)) {
      await fs.unlink(filePath).catch(() => {});
    }

    job.practicalAssessmentTemplate = { ...tpl, resources: filtered } as any;
    job.markModified("practicalAssessmentTemplate");
    await job.save();

    const pipeline = await Pipeline.findOne({ jobId: job._id });
    if (pipeline) {
      const pIdx = pipeline.stages.findIndex(s => s.type === "practical");
      if (pIdx >= 0 && pipeline.stages[pIdx].assessmentDefinition) {
        pipeline.stages[pIdx].assessmentDefinition!.resources = filtered;
        pipeline.markModified(`stages`);
        await pipeline.save();
      }
    }

    res.json({ success: true, data: job });
  } catch (err: any) {
    console.error("[jobs] assessment-resources delete:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
