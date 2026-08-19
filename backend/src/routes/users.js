import { Router } from "express";
import { findUserById, updateUserProfile } from "../db.js";
import { getSupabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";
import { publicUser, asyncHandler } from "../utils.js";

const router = Router();

const RESUME_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
const MAX_RESUME_BYTES = 2 * 1024 * 1024;

async function canViewSeeker(requester, target) {
  if (!target) return false;
  if (requester.id === target.id) return true;
  if (requester.role !== "recruiter") return false;
  const { data: jobs } = await getSupabase()
    .from("jobs").select("id").eq("recruiter_id", requester.id);
  if (!jobs || jobs.length === 0) return false;
  const jobIds = jobs.map((j) => j.id);
  const { count } = await getSupabase()
    .from("applications").select("*", { count: "exact", head: true })
    .eq("seeker_id", target.id)
    .in("job_id", jobIds);
  return count > 0;
}

function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

function cleanSkills(input) {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  return list.map((s) => String(s).trim()).filter(Boolean).slice(0, 20).map((s) => s.slice(0, 40));
}

// PUT /api/users/me/profile
router.put("/me/profile", authenticate, asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });

  const profile = user.profile || {};
  const { headline, company, location, experience, bio, linkedin } = req.body;

  if (headline !== undefined) profile.headline = String(headline).trim().slice(0, 120);
  if (company !== undefined) profile.company = String(company).trim().slice(0, 120);
  if (location !== undefined) profile.location = String(location).trim().slice(0, 120);
  if (experience !== undefined) profile.experience = String(experience).trim().slice(0, 2000);
  if (bio !== undefined) profile.bio = String(bio).trim().slice(0, 2000);
  if (linkedin !== undefined) {
    let value = String(linkedin).trim().slice(0, 200);
    if (value && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = "https://" + value;
    profile.linkedin = value;
  }
  if (req.body.skills !== undefined) profile.skills = cleanSkills(req.body.skills);
  profile.updatedAt = new Date().toISOString();

  await updateUserProfile(req.user.id, profile);
  const updated = await findUserById(req.user.id);
  res.json({ user: publicUser(updated) });
}));

// POST /api/users/me/resume
router.post("/me/resume", authenticate, asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });

  const { name, mimeType, dataUrl } = req.body || {};
  if (!name || !mimeType || !dataUrl) {
    return res.status(400).json({ error: "Resume name, type, and data are required." });
  }
  if (!RESUME_TYPES[mimeType]) {
    return res.status(400).json({ error: "Resume must be a PDF, Word document, or text file." });
  }
  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    return res.status(400).json({ error: "Invalid file data." });
  }
  const size = dataUrlBytes(dataUrl);
  if (size === 0) return res.status(400).json({ error: "The file is empty." });
  if (size > MAX_RESUME_BYTES) {
    return res.status(400).json({ error: "Resume must be under 2 MB." });
  }

  const profile = user.profile || {};
  profile.resume = {
    name: String(name).slice(0, 120),
    mimeType,
    size,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
  profile.updatedAt = profile.resume.uploadedAt;

  await updateUserProfile(req.user.id, profile);
  const updated = await findUserById(req.user.id);
  res.json({ user: publicUser(updated) });
}));

// DELETE /api/users/me/resume
router.delete("/me/resume", authenticate, asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  if (!user.profile?.resume) return res.status(404).json({ error: "No resume on file." });

  const profile = user.profile;
  delete profile.resume;
  profile.updatedAt = new Date().toISOString();

  await updateUserProfile(req.user.id, profile);
  const updated = await findUserById(req.user.id);
  res.json({ user: publicUser(updated) });
}));

// GET /api/users/:id
router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const target = await findUserById(Number(req.params.id));
  if (!target) return res.status(404).json({ error: "User not found." });
  if (!(await canViewSeeker(req.user, target))) {
    return res.status(403).json({ error: "You can only view candidates who applied to your postings." });
  }
  res.json({ user: publicUser(target) });
}));

// GET /api/users/:id/resume
router.get("/:id/resume", authenticate, asyncHandler(async (req, res) => {
  const target = await findUserById(Number(req.params.id));
  if (!target) return res.status(404).json({ error: "User not found." });
  if (!(await canViewSeeker(req.user, target))) {
    return res.status(403).json({ error: "You can only view candidates who applied to your postings." });
  }
  res.json({ resume: target.profile?.resume || null });
}));

export default router;
