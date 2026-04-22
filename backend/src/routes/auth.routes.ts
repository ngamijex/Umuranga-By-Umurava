import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model";
import { protect, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

const signToken = (id: string, role: string): string =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as string,
  } as any);

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: "Name, email, and password required" });
      return;
    }
    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }
    const user = await User.create({ name, email, password });
    const token = signToken(user._id.toString(), user.role);
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password required" });
      return;
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }
    const token = signToken(user._id.toString(), user.role);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/me", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
