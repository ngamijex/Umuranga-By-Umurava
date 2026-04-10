import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "GET /jobs — coming soon" });
});

router.post("/", (_req, res) => {
  res.json({ message: "POST /jobs — coming soon" });
});

router.get("/:id", (_req, res) => {
  res.json({ message: "GET /jobs/:id — coming soon" });
});

router.put("/:id", (_req, res) => {
  res.json({ message: "PUT /jobs/:id — coming soon" });
});

router.delete("/:id", (_req, res) => {
  res.json({ message: "DELETE /jobs/:id — coming soon" });
});

export default router;
