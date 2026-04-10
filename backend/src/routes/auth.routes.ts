import { Router } from "express";

const router = Router();

router.post("/register", (_req, res) => {
  res.json({ message: "POST /auth/register — coming soon" });
});

router.post("/login", (_req, res) => {
  res.json({ message: "POST /auth/login — coming soon" });
});

router.get("/me", (_req, res) => {
  res.json({ message: "GET /auth/me — coming soon" });
});

export default router;
