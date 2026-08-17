import { createClient } from "@supabase/supabase-js";

let _supabase;

export function getSupabase() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.error("SUPABASE_URL and SUPABASE_KEY must be set in .env");
      process.exit(1);
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  return _supabase;
}
