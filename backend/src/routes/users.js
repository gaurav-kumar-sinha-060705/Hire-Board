import { Router } from "express";
import { findUserById, updateUserProfile, updateUserFields, updateUserCompany } from "../db.js";
import { getSupabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";
import { publicUser, asyncHandler, cleanString, cleanUrl, dataUrlBytes } from "../utils.js";

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

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function cleanSkills(input) {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  return list.map((s) => String(s).trim()).filter(Boolean).slice(0, 20).map((s) => s.slice(0, 40));
}

function cleanArray(arr, maxItems, itemFn) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems).map(itemFn).filter(Boolean);
}

// PUT /api/users/me/profile
router.put("/me/profile", authenticate, asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });

  const profile = user.profile || {};
  const { headline, company, location, experience, bio, linkedin } = req.body;

  if (headline !== undefined) profile.headline = cleanString(headline, 120);
  if (company !== undefined) profile.company = cleanString(company, 120);
  if (location !== undefined) profile.location = cleanString(location, 120);
  if (experience !== undefined) profile.experience = cleanString(experience, 2000);
  if (bio !== undefined) profile.bio = cleanString(bio, 2000);
  if (linkedin !== undefined) profile.linkedin = cleanUrl(linkedin, 200);
  if (req.body.skills !== undefined) profile.skills = cleanSkills(req.body.skills);
  profile.updatedAt = new Date().toISOString();

  await updateUserProfile(req.user.id, profile);

  if (user.role === "recruiter" && company !== undefined) {
    const name = cleanString(company, 120);
    if (name) await updateUserCompany(req.user.id, name);
  }

  const topFields = {};

  if (req.body.phone !== undefined) topFields.phone = cleanString(req.body.phone, 20);

  if (req.body.portfolio_url !== undefined) topFields.portfolio_url = cleanUrl(req.body.portfolio_url, 200);

  if (req.body.avatar !== undefined) {
    const avatar = req.body.avatar;
    if (avatar && typeof avatar === "string") {
      if (!avatar.startsWith("data:image/")) return res.status(400).json({ error: "Invalid avatar format." });
      if (dataUrlBytes(avatar) > MAX_AVATAR_BYTES) return res.status(400).json({ error: "Avatar must be under 2 MB." });
    }
    topFields.avatar = avatar || null;
  }

  if (req.body.education !== undefined) {
    topFields.education = cleanArray(req.body.education, 10, (e) => ({
      school: cleanString(e.school, 120),
      degree: cleanString(e.degree, 120),
      field: cleanString(e.field, 120),
      startYear: Number(e.startYear) || null,
      endYear: Number(e.endYear) || null,
      grade: cleanString(e.grade, 40),
    }));
  }

  if (req.body.work_experience !== undefined) {
    topFields.work_experience = cleanArray(req.body.work_experience, 10, (w) => ({
      company: cleanString(w.company, 120),
      title: cleanString(w.title, 120),
      startDate: cleanString(w.startDate, 10),
      endDate: w.current ? "" : cleanString(w.endDate, 10),
      current: Boolean(w.current),
      description: cleanString(w.description, 2000),
    }));
  }

  if (req.body.certifications !== undefined) {
    topFields.certifications = cleanArray(req.body.certifications, 10, (c) => ({
      name: cleanString(c.name, 120),
      issuer: cleanString(c.issuer, 120),
      date: cleanString(c.date, 10),
      url: cleanUrl(c.url, 200),
    }));
  }

  if (req.body.languages !== undefined) {
    topFields.languages = cleanArray(req.body.languages, 10, (l) => ({
      language: cleanString(l.language, 60),
      proficiency: cleanString(l.proficiency, 40),
    }));
  }

  if (req.body.job_preferences !== undefined) {
    const jp = req.body.job_preferences || {};
    topFields.job_preferences = {
      jobTypes: cleanArray(jp.jobTypes, 5, (v) => cleanString(v, 20)),
      workMode: cleanArray(jp.workMode, 5, (v) => cleanString(v, 20)),
      salaryMin: Number(jp.salaryMin) || null,
      salaryMax: Number(jp.salaryMax) || null,
      locations: cleanArray(jp.locations, 10, (v) => cleanString(v, 120)),
    };
  }

  if (Object.keys(topFields).length > 0) {
    await updateUserFields(req.user.id, topFields);
  }

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
