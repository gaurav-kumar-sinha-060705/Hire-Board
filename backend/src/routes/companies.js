import { Router } from "express";
import { findCompanyById, findCompanyByRecruiterId, createCompany, updateCompany, listCompanies, getCompanyJobCount } from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getSupabase } from "../supabase.js";

const router = Router();
const TYPES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Design", "Consulting", "Manufacturing", "Retail", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function validateCompany(body) {
  const { name, location, type, description, website, size } = body;
  if (!name?.trim() || !location?.trim() || !type?.trim() || !description?.trim()) {
    return { error: "Name, location, type, and description are required." };
  }
  if (String(name).trim().length > 120) return { error: "Company name must be under 120 characters." };
  if (String(location).trim().length > 120) return { error: "Location must be under 120 characters." };
  if (!TYPES.includes(type)) return { error: `Type must be one of: ${TYPES.join(", ")}.` };
  if (size && !SIZES.includes(size)) return { error: `Size must be one of: ${SIZES.join(", ")}.` };
  if (String(website || "").trim().length > 200) return { error: "Website must be under 200 characters." };
  if (String(description).trim().length > 5000) return { error: "Description must be under 5,000 characters." };

  return {
    company: {
      name: String(name).trim(),
      location: String(location).trim(),
      type: String(type).trim(),
      description: String(description).trim(),
      website: String(website || "").trim(),
      size: size || "",
    },
  };
}

// GET /api/companies?page=1&limit=12
router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const result = await listCompanies({ page, limit });
  res.json(result);
});

// GET /api/companies/mine
router.get("/mine", authenticate, authorize("recruiter"), async (req, res) => {
  const company = await findCompanyByRecruiterId(req.user.id);
  if (!company) return res.status(404).json({ error: "No company registered." });
  const jobCount = await getCompanyJobCount(company.id);
  res.json({ company: { ...company, jobCount } });
});

// GET /api/companies/:id
router.get("/:id", async (req, res) => {
  const company = await findCompanyById(Number(req.params.id));
  if (!company) return res.status(404).json({ error: "Company not found." });

  const jobCount = await getCompanyJobCount(company.id);

  const { data: recentJobs } = await getSupabase()
    .from("jobs")
    .select("id, title, location, type, mode, salary, posted_at")
    .eq("company_id", company.id)
    .order("id", { ascending: false })
    .limit(10);

  const enrichedJobs = await Promise.all(
    (recentJobs || []).map(async (j) => {
      const { count } = await getSupabase()
        .from("applications").select("*", { count: "exact", head: true }).eq("job_id", j.id);
      return { ...j, applicantCount: count || 0 };
    })
  );

  res.json({ company: { ...company, jobCount }, recentJobs: enrichedJobs });
});

// POST /api/companies
router.post("/", authenticate, authorize("recruiter"), async (req, res) => {
  const existing = await findCompanyByRecruiterId(req.user.id);
  if (existing) return res.status(409).json({ error: "You already have a registered company." });

  const result = validateCompany(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const company = await createCompany({ ...result.company, recruiterId: req.user.id });
  const jobCount = await getCompanyJobCount(company.id);

  res.status(201).json({ company: { ...company, jobCount } });
});

// PUT /api/companies/:id
router.put("/:id", authenticate, authorize("recruiter"), async (req, res) => {
  const companyId = Number(req.params.id);
  const company = await findCompanyById(companyId);
  if (!company) return res.status(404).json({ error: "Company not found." });
  if (company.recruiter_id !== req.user.id) return res.status(403).json({ error: "This isn't your company." });

  const result = validateCompany(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const updated = await updateCompany(companyId, result.company);
  const jobCount = await getCompanyJobCount(companyId);

  res.json({ company: { ...updated, jobCount } });
});

export default router;
