import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, findUserById, createUser, updateUserPassword } from "../db.js";
import { createEmailOTP, verifyEmailOTP, sendVerificationEmail, sendPasswordResetEmail } from "../email.js";
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

  const otp = await createEmailOTP(email, user.id, "verify");
  const emailResult = await sendVerificationEmail(email, otp);

  res.status(201).json({
    token: sign(user),
    user: publicUser(user),
    ...(emailResult.dev ? { devOtp: emailResult.otp } : {}),
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

router.post("/verify-email", authLimiter, async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required." });

  const userId = await verifyEmailOTP(email, otp, "verify");
  if (!userId) return res.status(400).json({ error: "Invalid or expired verification code." });

  const user = await findUserById(userId);
  res.json({ message: "Email verified successfully.", user: publicUser(user) });
});

router.post("/resend-otp", authLimiter, async (req, res) => {
  const { email, purpose } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = await findUserByEmail(email);
  if (!user) return res.status(200).json({ message: "If an account exists, a code has been sent." });
  if (purpose === "verify" && user.email_verified) return res.status(200).json({ message: "Email is already verified." });

  const otpPurpose = purpose || "verify";
  const otp = await createEmailOTP(email, user.id, otpPurpose);

  let emailResult;
  if (otpPurpose === "reset") {
    emailResult = await sendPasswordResetEmail(email, otp);
  } else {
    emailResult = await sendVerificationEmail(email, otp);
  }

  res.json({
    message: "Verification code sent.",
    ...(emailResult.dev ? { devOtp: emailResult.otp } : {}),
  });
});

router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email || "");

  if (user) {
    const otp = await createEmailOTP(user.email, user.id, "reset");
    const emailResult = await sendPasswordResetEmail(user.email, otp);

    res.json({
      message: "If an account exists, a reset code has been sent.",
      ...(emailResult.dev ? { devOtp: emailResult.otp } : {}),
    });
  } else {
    res.json({ message: "If an account exists, a reset code has been sent." });
  }
});

router.post("/reset-password", authLimiter, async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: "Email, OTP, and new password are required." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (password.length > 128) return res.status(400).json({ error: "Password must be under 128 characters." });

  const userId = await verifyEmailOTP(email, otp, "reset");
  if (!userId) return res.status(400).json({ error: "Invalid or expired reset code." });

  const hashed = await bcrypt.hash(password, 10);
  await updateUserPassword(userId, hashed);

  res.json({ message: "Password has been reset. You can now sign in." });
});

export default router;
