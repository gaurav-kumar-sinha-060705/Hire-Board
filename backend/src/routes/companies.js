import { Router } from "express";
import { findCompanyById, findCompanyByRecruiterId, createCompany, updateCompany, listCompanies, getCompanyJobCount, updateUserCompany } from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getSupabase } from "../supabase.js";
import { asyncHandler, cleanString, cleanUrl, dataUrlBytes } from "../utils.js";

const router = Router();
const TYPES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Design", "Consulting", "Manufacturing", "Retail", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function validateCompany(body) {
  const { name, location, type, description, website, size, logo, founded_year, social_links, tech_stack, benefits, culture, registered } = body;
  if (!name?.trim() || !location?.trim() || !type?.trim() || !description?.trim()) {
    return { error: "Name, location, type, and description are required." };
  }
  if (cleanString(name, 120).length > 120) return { error: "Company name must be under 120 characters." };
  if (cleanString(location, 120).length > 120) return { error: "Location must be under 120 characters." };
  if (!TYPES.includes(type)) return { error: `Type must be one of: ${TYPES.join(", ")}.` };
  if (size && !SIZES.includes(size)) return { error: `Size must be one of: ${SIZES.join(", ")}.` };
  if (cleanString(website || "", 200).length > 200) return { error: "Website must be under 200 characters." };
  if (cleanString(description, 5000).length > 5000) return { error: "Description must be under 5,000 characters." };

  if (logo && typeof logo === "string") {
    if (!logo.startsWith("data:image/")) return { error: "Invalid logo format." };
    if (dataUrlBytes(logo) > 2 * 1024 * 1024) return { error: "Logo must be under 2 MB." };
  }

  if (founded_year !== null && founded_year !== undefined && founded_year !== "") {
    const yr = Number(founded_year);
    if (!yr || yr < 1900 || yr > new Date().getFullYear()) return { error: `Founded year must be between 1900 and ${new Date().getFullYear()}.` };
  }

  if (social_links && typeof social_links === "object") {
    for (const [key, val] of Object.entries(social_links)) {
      if (val && typeof val === "string" && val.length > 200) return { error: `${key} URL must be under 200 characters.` };
    }
  }

  if (tech_stack && !Array.isArray(tech_stack)) return { error: "Tech stack must be an array." };
  if (Array.isArray(tech_stack) && tech_stack.length > 30) return { error: "Tech stack must have at most 30 items." };

  if (benefits && !Array.isArray(benefits)) return { error: "Benefits must be an array." };
  if (Array.isArray(benefits) && benefits.length > 20) return { error: "Benefits must have at most 20 items." };

  if (culture !== undefined && cleanString(culture, 3000).length > 3000) return { error: "Culture must be under 3,000 characters." };

  return {
    company: {
      name: cleanString(name, 120),
      location: cleanString(location, 120),
      type: cleanString(type, 40),
      description: cleanString(description, 5000),
      website: cleanUrl(website, 200),
      size: size || "",
      logo: logo || null,
      founded_year: founded_year ? Number(founded_year) : null,
      social_links: social_links || {},
      tech_stack: Array.isArray(tech_stack) ? tech_stack.map((s) => cleanString(s, 40)).filter(Boolean).slice(0, 30) : [],
      benefits: Array.isArray(benefits) ? benefits.map((b) => cleanString(b, 60)).filter(Boolean).slice(0, 20) : [],
      culture: cleanString(culture, 3000),
      registered: Boolean(registered),
    },
  };
}

// GET /api/companies?page=1&limit=12
router.get("/", asyncHandler(async (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const result = await listCompanies({ q, page, limit });
  res.json(result);
}));

// GET /api/companies/mine
router.get("/mine", authenticate, authorize("recruiter"), asyncHandler(async (req, res) => {
  const company = await findCompanyByRecruiterId(req.user.id);
  if (!company) return res.status(404).json({ error: "No company registered." });
  const jobCount = await getCompanyJobCount(company.id);
  res.json({ company: { ...company, jobCount } });
}));

// GET /api/companies/:id
router.get("/:id", asyncHandler(async (req, res) => {
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
}));

// POST /api/companies
router.post("/", authenticate, authorize("recruiter"), asyncHandler(async (req, res) => {
  const existing = await findCompanyByRecruiterId(req.user.id);
  if (existing) return res.status(409).json({ error: "You already have a registered company." });

  const result = validateCompany(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const company = await createCompany({ ...result.company, recruiterId: req.user.id });
  await updateUserCompany(req.user.id, result.company.name);
  const jobCount = await getCompanyJobCount(company.id);

  res.status(201).json({ company: { ...company, jobCount } });
}));

// PUT /api/companies/:id
router.put("/:id", authenticate, authorize("recruiter"), asyncHandler(async (req, res) => {
  const companyId = Number(req.params.id);
  const company = await findCompanyById(companyId);
  if (!company) return res.status(404).json({ error: "Company not found." });
  if (company.recruiter_id !== req.user.id) return res.status(403).json({ error: "This isn't your company." });

  const result = validateCompany(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const updated = await updateCompany(companyId, result.company);
  await updateUserCompany(req.user.id, result.company.name);
  const jobCount = await getCompanyJobCount(companyId);

  res.json({ company: { ...updated, jobCount } });
}));

export default router;
