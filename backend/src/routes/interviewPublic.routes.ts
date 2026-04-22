import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { InterviewSession } from "../models/InterviewSession.model";
import { Job } from "../models/Job.model";
import { Candidate } from "../models/Candidate.model";
import { getAIResponse, gradeInterview, buildOpeningMessage } from "../services/interview.service";

const router = Router();

const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

/* ── helpers ── */
function isExpired(session: { windowEnd: Date; status: string }): boolean {
  return session.status !== "completed" && new Date() > new Date(session.windowEnd);
}

/* GET /public/interview/:token — session info for the candidate landing page */
router.get("/:token", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await InterviewSession.findOne({ inviteToken: req.params.token })
      .populate<{ candidateId: { name: string; email: string } }>("candidateId", "name email")
      .lean();

    if (!session) {
      res.status(404).json({ success: false, error: "Interview link not found." });
      return;
    }

    if (isExpired(session as any)) {
      res.status(403).json({ success: false, error: "This interview link has expired." });
      return;
    }

    if (session.status === "completed") {
      res.status(200).json({
        success: true,
        data: { status: "completed", message: "You have already completed this interview. Thank you!" },
      });
      return;
    }

    const job = await Job.findById(session.jobId).select("title department").lean();

    res.json({
      success: true,
      data: {
        jobTitle: job?.title || "Role",
        department: job?.department || "",
        candidateName: (session.candidateId as any)?.name || "",
        status: session.status,
        windowStart: session.windowStart,
        windowEnd: session.windowEnd,
        questionCount: session.interviewQuestions.length,
        startedAt: session.startedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /public/interview/:token/start — begin the interview, get opening AI message */
router.post("/:token/start", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await InterviewSession.findOne({ inviteToken: req.params.token });
    if (!session) { res.status(404).json({ success: false, error: "Link not found." }); return; }
    if (isExpired(session)) { res.status(403).json({ success: false, error: "Link has expired." }); return; }
    if (session.status === "completed") {
      res.status(400).json({ success: false, error: "Interview already completed." }); return;
    }

    const job = await Job.findById(session.jobId);
    if (!job) { res.status(404).json({ success: false, error: "Job not found." }); return; }

    if (session.status === "pending") {
      session.status = "in_progress";
      session.startedAt = new Date();
      // Push the opening AI message into the transcript
      const opening = buildOpeningMessage(job, session.interviewQuestions[0] || "Tell me about yourself.");
      session.transcript.push({ speaker: "ai", text: opening, timestamp: new Date() });
      await session.save();
    }

    // Return the latest AI message (opening or last AI turn if resuming)
    const lastAiMsg = [...session.transcript].reverse().find(t => t.speaker === "ai");

    res.json({
      success: true,
      data: {
        message: lastAiMsg?.text || "Welcome to your interview.",
        transcript: session.transcript,
        isComplete: false,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /public/interview/:token/turn — send candidate answer, receive AI response */
router.post("/:token/turn", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await InterviewSession.findOne({ inviteToken: req.params.token });
    if (!session) { res.status(404).json({ success: false, error: "Link not found." }); return; }
    if (session.status === "completed") {
      res.status(400).json({ success: false, error: "Interview already completed." }); return;
    }
    if (isExpired(session)) { res.status(403).json({ success: false, error: "Link has expired." }); return; }

    const candidateText = String(req.body?.text || "").trim();
    if (!candidateText) {
      res.status(400).json({ success: false, error: "Candidate answer text is required." }); return;
    }

    const job = await Job.findById(session.jobId);
    if (!job) { res.status(404).json({ success: false, error: "Job not found." }); return; }

    // Append candidate turn
    session.transcript.push({ speaker: "candidate", text: candidateText, timestamp: new Date() });

    // Get AI response
    const { message, isComplete } = await getAIResponse(
      job,
      session.interviewQuestions,
      session.transcript.slice(0, -1), // transcript before latest candidate turn
      candidateText
    );

    // Append AI response
    session.transcript.push({ speaker: "ai", text: message, timestamp: new Date() });

    if (isComplete) {
      session.status = "completed";
      session.completedAt = new Date();
    }

    await session.save();

    // Async grading when completed (non-blocking)
    if (isComplete && !session.score) {
      gradeInterview(job, session.transcript)
        .then(score => InterviewSession.findByIdAndUpdate(session._id, { score }))
        .catch(e => console.error("[interview] grading failed:", e?.message));
    }

    res.json({
      success: true,
      data: { message, isComplete, transcript: session.transcript },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /public/interview/:token/recording — upload video blob */
router.post("/:token/recording", recordingUpload.single("recording"), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await InterviewSession.findOne({ inviteToken: req.params.token });
    if (!session) { res.status(404).json({ success: false, error: "Link not found." }); return; }
    if (!req.file) { res.status(400).json({ success: false, error: "No recording file." }); return; }

    const dir = path.join(process.cwd(), "uploads", "interview-recordings", String(session.jobId));
    await fs.mkdir(dir, { recursive: true });

    const storedName = `${String(session._id)}.webm`;
    await fs.writeFile(path.join(dir, storedName), req.file.buffer);

    session.recordingStoredName = storedName;
    await session.save();

    res.json({ success: true, message: "Recording saved." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
