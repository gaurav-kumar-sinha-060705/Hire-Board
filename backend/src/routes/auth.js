import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, findUserById, createUser } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const authLimiter = rateLimit(10, "Too many attempts. Wait a minute and try again.");

function sign(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

router.post("/register", authLimiter, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: "Enter your name." });
  if (String(name).trim().length > 80) return res.status(400).json({ error: "Name must be under 80 characters." });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email." });
  if (String(email).length > 200) return res.status(400).json({ error: "Email must be under 200 characters." });
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (password.length > 128) return res.status(400).json({ error: "Password must be under 128 characters." });
  if (role !== "recruiter" && role !== "seeker") return res.status(400).json({ error: "Choose an account type." });

  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  const hashed = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, password: hashed, role });

  res.status(201).json({
    token: sign(user),
    user: publicUser(user),
  });
});

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email || "");
  if (!user) return res.status(401).json({ error: "Incorrect email or password." });

  const ok = await bcrypt.compare(password || "", user.password);
  if (!ok) return res.status(401).json({ error: "Incorrect email or password." });

  res.json({ token: sign(user), user: publicUser(user) });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user: publicUser(user) });
});

export default router;
