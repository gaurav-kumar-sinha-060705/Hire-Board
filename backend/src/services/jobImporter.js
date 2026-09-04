import { upsertImportedJob, deactivateStaleImportedJobs } from "../db.js";

const REMOTEOK_API = "https://remoteok.com/api";
const SYSTEM_USER_ID = 1;
const SYSTEM_COMPANY_ID = 1;
const SYSTEM_RECRUITER_NAME = "Hire Board";
const SOURCE = "remoteok";

const TYPE_MAP = {
  "full time": "Full-time",
  "full-time": "Full-time",
  "part time": "Part-time",
  "part-time": "Part-time",
  internship: "Internship",
  contract: "Contract",
};

const META_TAGS = new Set([
  "non tech", "full time", "part time", "remote", "digital nomad",
  "exec", "ops", "scheme", "senior", "internship", "contract",
  "hiring", "no experience", "entry level",
]);

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferType(tags) {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (TYPE_MAP[lower]) return TYPE_MAP[lower];
  }
  return "Full-time";
}

function extractSkills(tags) {
  return tags
    .filter((t) => !META_TAGS.has(t.toLowerCase()))
    .filter((t) => t.length <= 40)
    .slice(0, 20);
}

function transformJob(remoteJob) {
  let location = (remoteJob.location || "").replace(/,\s*$/, "").trim();
  if (!location || location.toLowerCase() === "remote") location = "Worldwide";
  const salaryMin = remoteJob.salary_min > 0 ? remoteJob.salary_min : null;
  const salaryMax = remoteJob.salary_max > 0 ? remoteJob.salary_max : null;
  const tags = Array.isArray(remoteJob.tags) ? remoteJob.tags : [];

  return {
    title: (remoteJob.position || "").trim().slice(0, 120),
    company_id: SYSTEM_COMPANY_ID,
    company_name: (remoteJob.company || "").trim().slice(0, 120) || "Unknown",
    location: location.slice(0, 120),
    type: inferType(tags),
    mode: "Remote",
    description: stripHtml(remoteJob.description || "").slice(0, 20000),
    recruiter_id: SYSTEM_USER_ID,
    recruiter_name: SYSTEM_RECRUITER_NAME,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: "USD",
    required_skills: extractSkills(tags),
    external_id: String(remoteJob.id),
    external_url: remoteJob.url || `https://remoteok.com/remote-jobs/${remoteJob.id}`,
    source: SOURCE,
  };
}

async function fetchRemoteOKJobs() {
  const res = await fetch(REMOTEOK_API, {
    headers: { "User-Agent": "HireBoard-JobImporter/1.0" },
  });
  if (!res.ok) throw new Error(`RemoteOK API returned ${res.status}`);
  const data = await res.json();
  // First element is metadata, skip it
  return Array.isArray(data) ? data.slice(1) : [];
}

export async function runImport() {
  const stats = { fetched: 0, inserted: 0, updated: 0, deactivated: 0, errors: 0 };

  try {
    const remoteJobs = await fetchRemoteOKJobs();
    stats.fetched = remoteJobs.length;

    const externalIds = [];

    for (const remoteJob of remoteJobs) {
      try {
        const job = transformJob(remoteJob);
        if (!job.title) continue;
        externalIds.push(job.external_id);

        const result = await upsertImportedJob(job);
        if (result.action === "inserted") stats.inserted++;
        else stats.updated++;
      } catch (err) {
        stats.errors++;
        console.error(`[Importer] Error processing job ${remoteJob.id}:`, err.message);
      }
    }

    if (externalIds.length > 0) {
      stats.deactivated = await deactivateStaleImportedJobs(SOURCE, externalIds);
    }

    console.log(`[Importer] Done: ${stats.fetched} fetched, ${stats.inserted} new, ${stats.updated} updated, ${stats.deactivated} deactivated, ${stats.errors} errors`);
    return stats;
  } catch (err) {
    console.error("[Importer] Fatal error:", err.message);
    throw err;
  }
}
