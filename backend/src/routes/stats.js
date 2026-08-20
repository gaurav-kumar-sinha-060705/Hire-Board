import { Router } from "express";
import { getSupabase } from "../supabase.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const db = getSupabase();

    const [jobs, companies, users] = await Promise.all([
      db.from("jobs").select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString()),
      db.from("companies").select("*", { count: "exact", head: true }),
      db.from("users").select("*", { count: "exact", head: true }),
    ]);

    res.json({
      totalJobs: jobs.count || 0,
      totalCompanies: companies.count || 0,
      totalUsers: users.count || 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
