-- ============================================
-- HIRE BOARD - FULL DATABASE RESET
-- Run this in Supabase SQL Editor
-- Password for system user: HireBoard@System123!
-- ============================================

-- 1. Truncate all tables (FK-safe order with CASCADE)
TRUNCATE TABLE email_otps CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE applications CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE users CASCADE;

-- 2. Reset auto-increment sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE companies_id_seq RESTART WITH 1;
ALTER SEQUENCE jobs_id_seq RESTART WITH 1;
ALTER SEQUENCE applications_id_seq RESTART WITH 1;
ALTER SEQUENCE conversations_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE email_otps_id_seq RESTART WITH 1;

-- 3. Seed system user (for imported jobs)
INSERT INTO users (name, email, password, role, email_verified)
VALUES (
  'Hire Board',
  'system@hireboard.in',
  '$2a$10$r/SPPHzlFB5uEFCpUxMWr.zQBlvgy/pekFCsK/3ITZoxWUMHLSvX2',
  'recruiter',
  true
);

-- 4. Seed system company (for imported jobs)
INSERT INTO companies (
  name, location, type, description, website, size,
  social_links, tech_stack, benefits, culture,
  registered, recruiter_id
)
VALUES (
  'RemoteOK Curated',
  'Global',
  'Job Board',
  'Curated remote jobs sourced from RemoteOK',
  'https://remoteok.com',
  '1-10',
  '{}',
  '{}',
  '{}',
  'Curated remote job listings from global employers.',
  false,
  1
);

-- 5. Verify reset
SELECT 'Users:' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'Companies:', count(*) FROM companies
UNION ALL
SELECT 'Jobs:', count(*) FROM jobs
UNION ALL
SELECT 'Applications:', count(*) FROM applications
UNION ALL
SELECT 'Conversations:', count(*) FROM conversations
UNION ALL
SELECT 'Messages:', count(*) FROM messages
UNION ALL
SELECT 'Notifications:', count(*) FROM notifications
UNION ALL
SELECT 'Email OTPs:', count(*) FROM email_otps;
