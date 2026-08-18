import { Router } from "express";
import {
  findJobById, listJobs, listJobsByRecruiter, createJob, updateJob, toggleJobActive, deleteJob,
  findCompanyById, findApplication, createApplication, updateApplicationStatus,
  getApplicantDetails, getAppliedJobIds, findApplicationsBySeekerId, pushNotification,
  deleteConversationsByJobId,
} from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getSupabase } from "../supabase.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["applied", "in-review", "shortlisted", "rejected", "accepted"];
const TYPES = ["Full-time", "Part-time", "Internship", "Contract"];
const MODES = ["On-site", "Remote", "Hybrid"];

async function validateJob(body, recruiterId) {
  const { title, companyId, location, type, mode, salary, description, requirements } = body;
  if (!title?.trim() || !companyId || !location?.trim() || !description?.trim()) {
    return { error: "Title, company, location, and description are required." };
  }
  const company = await findCompanyById(Number(companyId));
  if (!company) return { error: "Company not found. Please register a company first." };
  if (company.recruiter_id !== recruiterId) return { error: "You can only post jobs for your own company." };
  if (String(title).trim().length > 120) return { error: "Title must be under 120 characters." };
  if (String(location).trim().length > 120) return { error: "Location must be under 120 characters." };
  if (String(salary || "").trim().length > 60) return { error: "Salary must be under 60 characters." };
  if (String(description || "").trim().length > 20000) return { error: "Description must be under 20,000 characters." };
  if (String(requirements || "").trim().length > 20000) return { error: "Requirements must be under 20,000 characters." };
  if (type && !TYPES.includes(type)) return { error: `Type must be one of: ${TYPES.join(", ")}.` };
  if (mode && !MODES.includes(mode)) return { error: `Mode must be one of: ${MODES.join(", ")}.` };

  return {
    job: {
      title: String(title).trim(),
      companyId: company.id,
      companyName: company.name,
      location: String(location).trim(),
      type: type || "Full-time",
      mode: mode || "On-site",
      salary: String(salary || "").trim().slice(0, 60),
      description: String(description).trim(),
      requirements: String(requirements || "").trim(),
    },
  };
}

// GET /api/jobs?q=search&page=1&limit=12
router.get("/", async (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const companyId = req.query.companyId ? Number(req.query.companyId) : null;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));

  const result = await listJobs({ q, companyId, page, limit });
  res.json(result);
});

// GET /api/jobs/mine
router.get("/mine", authenticate, authorize("recruiter"), async (req, res) => {
  const jobs = await listJobsByRecruiter(req.user.id);
  res.json({ jobs });
});

// GET /api/jobs/mine/applied
router.get("/mine/applied", authenticate, authorize("seeker"), async (req, res) => {
  const jobIds = await getAppliedJobIds(req.user.id);
  res.json({ jobIds });
});

// GET /api/jobs/applications/mine
router.get("/applications/mine", authenticate, authorize("seeker"), async (req, res) => {
  const applications = await findApplicationsBySeekerId(req.user.id);
  res.json({ applications });
});

// GET /api/jobs/:id
router.get("/:id", async (req, res) => {
  const job = await findJobById(Number(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (!job.is_active) return res.status(404).json({ error: "This job posting is no longer active." });

  const company = job.company_id ? await findCompanyById(job.company_id) : null;
  const { count: appCount } = await getSupabase()
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("job_id", job.id);

  res.json({
    job: {
      ...job,
      company: company
        ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
        : { id: null, name: job.company_name, location: job.location, type: null, description: "", website: "", size: "" },
      applicantCount: appCount || 0,
    },
  });
});

// POST /api/jobs
router.post("/", authenticate, authorize("recruiter"), async (req, res) => {
  const result = await validateJob(req.body, req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });

  const job = await createJob({ ...result.job, recruiterId: req.user.id, recruiterName: req.user.name });
  res.status(201).json({ job });
});

// PUT /api/jobs/:id
router.put("/:id", authenticate, authorize("recruiter"), async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.recruiter_id !== req.user.id) return res.status(403).json({ error: "This job isn't yours." });

  const result = await validateJob(req.body, req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });

  await updateJob(jobId, result.job);

  const updated = await findJobById(jobId);
  const company = updated.company_id ? await findCompanyById(updated.company_id) : null;
  const { count: appCount } = await getSupabase()
    .from("applications").select("*", { count: "exact", head: true }).eq("job_id", jobId);

  res.json({
    job: {
      ...updated,
      company: company
        ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
        : { id: null, name: updated.company_name, location: updated.location, type: null, description: "", website: "", size: "" },
      applicantCount: appCount || 0,
    },
  });
});

// PATCH /api/jobs/:id/toggle-active
router.patch("/:id/toggle-active", authenticate, authorize("recruiter"), async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.recruiter_id !== req.user.id) return res.status(403).json({ error: "This job isn't yours." });

  await toggleJobActive(jobId);

  const updated = await findJobById(jobId);
  const company = updated.company_id ? await findCompanyById(updated.company_id) : null;
  const { count: appCount } = await getSupabase()
    .from("applications").select("*", { count: "exact", head: true }).eq("job_id", jobId);

  res.json({
    job: {
      ...updated,
      company: company
        ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
        : { id: null, name: updated.company_name, location: updated.location, type: null, description: "", website: "", size: "" },
      applicantCount: appCount || 0,
    },
  });
});

// DELETE /api/jobs/:id
router.delete("/:id", authenticate, authorize("recruiter"), async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.recruiter_id !== req.user.id) return res.status(403).json({ error: "This job isn't yours." });

  const company = job.company_id ? await findCompanyById(job.company_id) : null;
  const result = {
    ...job,
    company: company
      ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
      : { id: null, name: job.company_name, location: job.location, type: null, description: "", website: "", size: "" },
  };

  await deleteConversationsByJobId(jobId);
  await getSupabase().from("applications").delete().eq("job_id", jobId);
  await deleteJob(jobId);

  res.json({ job: result });
});

// POST /api/jobs/:id/apply
router.post("/:id/apply", authenticate, authorize("seeker"), async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (!job.is_active) return res.status(400).json({ error: "This job posting is no longer accepting applications." });

  const { name, email, note } = req.body;
  if (!name?.trim() || !EMAIL_RE.test(email || "")) {
    return res.status(400).json({ error: "Enter your name and a valid email." });
  }
  if (String(name).trim().length > 120) return res.status(400).json({ error: "Name must be under 120 characters." });
  if (String(note || "").length > 2000) return res.status(400).json({ error: "Cover note must be under 2,000 characters." });

  const already = await findApplication(jobId, req.user.id);
  if (already) return res.status(409).json({ error: "You already applied to this job." });

  const application = await createApplication({ jobId, seekerId: req.user.id, name: name.trim(), email: email.trim(), note: (note || "").trim() });

  await pushNotification({
    userId: job.recruiter_id,
    type: "application",
    message: `${req.user.name} applied to "${job.title}"`,
    link: `/my-jobs`,
  });

  res.status(201).json({ application });
});

// GET /api/jobs/:id/applicants
router.get("/:id/applicants", authenticate, authorize("recruiter"), async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.recruiter_id !== req.user.id) return res.status(403).json({ error: "This job isn't yours." });

  const applicants = await getApplicantDetails(jobId);
  res.json({ applicants });
});

// PATCH /api/jobs/:jobId/applicants/:appId
router.patch("/:jobId/applicants/:appId", authenticate, authorize("recruiter"), async (req, res) => {
  const jobId = Number(req.params.jobId);
  const appId = Number(req.params.appId);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.recruiter_id !== req.user.id) return res.status(403).json({ error: "This job isn't yours." });

  const { data: application } = await getSupabase()
    .from("applications").select("*").eq("id", appId).eq("job_id", jobId).maybeSingle();
  if (!application) return res.status(404).json({ error: "Application not found." });

  const status = (req.body.status || "").toLowerCase();
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}.` });
  }

  const updated = await updateApplicationStatus(appId, status);

  await pushNotification({
    userId: application.seeker_id,
    type: "application-status",
    message: `Your application for "${job.title}" is now ${status.replace("-", " ")}`,
    link: `/applications`,
  });

  res.json({ application: updated });
});

export default router;
