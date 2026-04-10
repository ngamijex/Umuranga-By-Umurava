import { Router } from "express";
import authRoutes from "./auth.routes";
import jobRoutes from "./job.routes";
import candidateRoutes from "./candidate.routes";
import screeningRoutes from "./screening.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/jobs", jobRoutes);
router.use("/candidates", candidateRoutes);
router.use("/screening", screeningRoutes);

router.get("/", (_req, res) => {
  res.json({ message: "Umuranga API v1", version: "0.1.0" });
});

export default router;
