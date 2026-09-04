import { getSupabase } from "./src/supabase.js";
import "dotenv/config";

const supabase = getSupabase();

const TABLES = [
  "email_otps",
  "notifications",
  "messages",
  "conversations",
  "applications",
  "jobs",
  "companies",
  "users",
];

async function reset() {
  console.log("=== HIRE BOARD DATABASE RESET ===\n");

  // 1. Delete all records from each table
  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().neq("id", 0);
    if (error) {
      console.error(`Error clearing ${table}:`, error.message);
    } else {
      console.log(`Cleared ${table}`);
    }
  }

  // 2. Seed system user
  console.log("\nSeeding system user...");
  const { data: systemUser, error: userError } = await supabase
    .from("users")
    .insert({
      name: "Hire Board",
      email: "system@hireboard.in",
      password: "$2a$10$r/SPPHzlFB5uEFCpUxMWr.zQBlvgy/pekFCsK/3ITZoxWUMHLSvX2",
      role: "recruiter",
      email_verified: true,
    })
    .select()
    .single();

  if (userError) {
    console.error("Error creating system user:", userError.message);
    process.exit(1);
  }
  console.log(`System user created (ID: ${systemUser.id})`);

  // 3. Seed system company
  console.log("Seeding system company...");
  const { data: systemCompany, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: "RemoteOK Curated",
      location: "Global",
      type: "Job Board",
      description: "Curated remote jobs sourced from RemoteOK",
      website: "https://remoteok.com",
      size: "1-10",
      social_links: {},
      tech_stack: [],
      benefits: [],
      culture: "Curated remote job listings from global employers.",
      registered: false,
      recruiter_id: systemUser.id,
    })
    .select()
    .single();

  if (companyError) {
    console.error("Error creating system company:", companyError.message);
    process.exit(1);
  }
  console.log(`System company created (ID: ${systemCompany.id})`);

  // 4. Verify
  console.log("\n=== VERIFICATION ===");
  for (const table of TABLES) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    console.log(`${table}: ${count} records`);
  }

  console.log("\n=== RESET COMPLETE ===");
  console.log("System login: system@hireboard.in / HireBoard@System123!");
}

reset().catch(console.error);
