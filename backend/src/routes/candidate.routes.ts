import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "GET /candidates — coming soon" });
});

router.post("/", (_req, res) => {
  res.json({ message: "POST /candidates — coming soon" });
});

router.get("/:id", (_req, res) => {
  res.json({ message: "GET /candidates/:id — coming soon" });
});

router.put("/:id", (_req, res) => {
  res.json({ message: "PUT /candidates/:id — coming soon" });
});

router.post("/:id/resume", (_req, res) => {
  res.json({ message: "POST /candidates/:id/resume — coming soon" });
});

export default router;
