import { Router } from "express";

const router = Router();

router.post("/run", (_req, res) => {
  res.json({ message: "POST /screening/run — coming soon" });
});

router.get("/results/:jobId", (_req, res) => {
  res.json({ message: "GET /screening/results/:jobId — coming soon" });
});

router.get("/results/:jobId/:candidateId", (_req, res) => {
  res.json({ message: "GET /screening/results/:jobId/:candidateId — coming soon" });
});

export default router;
