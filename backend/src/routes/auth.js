import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, findUserById, createUser, updateUserFields } from "../db.js";
import { createEmailOTP, verifyEmailOTP, sendVerificationEmail } from "../email.js";
import { authenticate } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { EMAIL_RE, publicUser, asyncHandler } from "../utils.js";

const router = Router();
const authLimiter = rateLimit(10, "Too many attempts. Wait a minute and try again.");

function sign(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", authLimiter, asyncHandler(async (req, res) => {
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
}));

router.post("/login", authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email || "");
  if (!user) return res.status(401).json({ error: "Incorrect email or password." });

  const ok = await bcrypt.compare(password || "", user.password);
  if (!ok) return res.status(401).json({ error: "Incorrect email or password." });

  res.json({ token: sign(user), user: publicUser(user) });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user: publicUser(user) });
}));

router.post("/verify-email", authLimiter, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required." });

  const userId = await verifyEmailOTP(email, otp, "verify");
  if (!userId) return res.status(400).json({ error: "Invalid or expired verification code." });

  const user = await findUserById(userId);
  if (!user) return res.status(400).json({ error: "Invalid or expired verification code." });
  const { password, ...rest } = user;
  res.json({ message: "Email verified successfully.", user: rest });
}));

router.post("/resend-otp", authLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = await findUserByEmail(email);
  if (!user) return res.status(200).json({ message: "If an account exists, a code has been sent." });
  if (user.email_verified) return res.status(200).json({ message: "Email is already verified." });

  let otp;
  try {
    otp = await createEmailOTP(email, user.id, "verify");
  } catch (err) {
    return res.status(429).json({ error: err.message });
  }

  const emailResult = await sendVerificationEmail(email, otp);

  if (emailResult.limited) {
    return res.status(429).json({ error: "Daily email limit reached. Try again tomorrow." });
  }

  if (emailResult.bounced) {
    return res.status(502).json({ error: "Email delivery failed. Please try a different email address or contact support." });
  }

  res.json({
    message: "Verification code sent.",
  });
}));

router.post("/forgot-password", authLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email." });

  const user = await findUserByEmail(email);
  if (!user) return res.status(200).json({ message: "If an account exists, a reset code has been sent." });

  let otp;
  try {
    otp = await createEmailOTP(email, user.id, "reset-password");
  } catch (err) {
    return res.status(429).json({ error: err.message });
  }

  const emailResult = await sendVerificationEmail(email, otp, "reset-password");

  if (emailResult.limited) {
    return res.status(429).json({ error: "Daily email limit reached. Try again tomorrow." });
  }

  if (emailResult.bounced) {
    return res.status(502).json({ error: "Email delivery failed. Please try a different email address or contact support." });
  }

  res.json({
    message: "If an account exists, a reset code has been sent.",
  });
}));

router.post("/reset-password", authLimiter, asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "Email, OTP, and new password are required." });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (newPassword.length > 128) return res.status(400).json({ error: "Password must be under 128 characters." });

  const userId = await verifyEmailOTP(email, otp, "reset-password");
  if (!userId) return res.status(400).json({ error: "Invalid or expired reset code." });

  const hashed = await bcrypt.hash(newPassword, 10);
  await updateUserFields(userId, { password: hashed });

  res.json({ message: "Password reset successfully. You can now sign in." });
}));

export default router;
