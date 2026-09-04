-- Add columns for external job imports (RemoteOK, etc.)
-- Run this in Supabase SQL Editor

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source text;

-- Index for dedup lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_source ON jobs (external_id, source) WHERE external_id IS NOT NULL AND source IS NOT NULL;
