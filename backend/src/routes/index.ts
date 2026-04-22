import { Router } from "express";
import authRoutes from "./auth.routes";
import jobRoutes from "./job.routes";
import candidateRoutes from "./candidate.routes";
import screeningRoutes from "./screening.routes";
import pipelineRoutes from "./pipeline.routes";
import practicalPublicRoutes from "./practicalPublic.routes";
import interviewPublicRoutes from "./interviewPublic.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/jobs", jobRoutes);
router.use("/candidates", candidateRoutes);
router.use("/screening", screeningRoutes);
router.use("/pipeline", pipelineRoutes);
router.use("/public/practical", practicalPublicRoutes);
router.use("/public/interview", interviewPublicRoutes);

router.get("/", (_req, res) => {
  res.json({ message: "Umuranga API v1", version: "0.1.0" });
});

export default router;
