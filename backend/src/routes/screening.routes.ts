import { Router, Response } from "express";
import { protect, AuthRequest } from "../middleware/auth.middleware";
import { Job } from "../models/Job.model";
import { Candidate } from "../models/Candidate.model";
import { ScreeningResult } from "../models/ScreeningResult.model";
import { getMsBetweenCandidates, sleep } from "../config/llmBatch";
import { screenCandidate } from "../services/screening.service";

const router = Router();
router.use(protect);

router.post("/run", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId, candidateId } = req.body;
    if (!jobId || !candidateId) { res.status(400).json({ success: false, error: "jobId and candidateId required" }); return; }
    const [job, candidate] = await Promise.all([Job.findById(jobId), Candidate.findById(candidateId)]);
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    if (!candidate) { res.status(404).json({ success: false, error: "Candidate not found" }); return; }
    const result = await screenCandidate(job, candidate);
    const screening = await ScreeningResult.findOneAndUpdate(
      { jobId, candidateId },
      { ...result, jobId, candidateId },
      { upsert: true, new: true }
    );
    await Candidate.findByIdAndUpdate(candidateId, { status: "screened" });
    res.json({ success: true, data: screening });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/run-all", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.body;
    if (!jobId) { res.status(400).json({ success: false, error: "jobId required" }); return; }
    const job = await Job.findById(jobId);
    if (!job) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    const candidates = await Candidate.find({ jobId });
    if (!candidates.length) { res.status(400).json({ success: false, error: "No candidates for this job" }); return; }

    const results: any[] = [];
    const errors: any[] = [];
    const gap = getMsBetweenCandidates();
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        if (gap > 0 && i > 0) await sleep(gap);
        const result = await screenCandidate(job, candidate);
        const s = await ScreeningResult.findOneAndUpdate(
          { jobId, candidateId: candidate._id },
          { ...result, jobId, candidateId: candidate._id },
          { upsert: true, new: true }
        );
        await Candidate.findByIdAndUpdate(candidate._id, { status: "screened" });
        results.push(s);
      } catch (e: any) {
        errors.push({ candidateId: candidate._id, error: e.message });
      }
    }
    const sorted = results.sort((a, b) => b.overallScore - a.overallScore);
    for (let i = 0; i < sorted.length; i++) {
      await ScreeningResult.findByIdAndUpdate(sorted[i]._id, { rank: i + 1 });
    }
    res.json({ success: true, data: { screened: results.length, errors, total: candidates.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/results/:jobId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const results = await ScreeningResult.find({ jobId: req.params.jobId })
      .populate("candidateId", "_id firstName lastName email headline location skills experience availability status")
      .sort({ overallScore: -1 });
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/results/:jobId/:candidateId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ScreeningResult.findOne({ jobId: req.params.jobId, candidateId: req.params.candidateId })
      .populate("candidateId");
    if (!result) { res.status(404).json({ success: false, error: "Result not found" }); return; }
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE /screening/results/:jobId/:candidateId — delete screening result for a candidate */
router.delete("/results/:jobId/:candidateId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ScreeningResult.deleteOne({ jobId: req.params.jobId, candidateId: req.params.candidateId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE /screening/results/:jobId — delete all screening results for a job */
router.delete("/results/:jobId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ScreeningResult.deleteMany({ jobId: req.params.jobId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
