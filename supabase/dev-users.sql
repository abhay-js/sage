-- ============================================================
-- DEV TEST ACCOUNTS
-- Run this once in Supabase Dashboard → SQL Editor
-- These accounts are only used for local/dev testing.
-- ============================================================

-- Step 1: Create auth users
-- NOTE: Supabase doesn't let you INSERT into auth.users with a plain password
-- directly via SQL. Use the Supabase Dashboard → Authentication → Users → "Add user"
-- to create each account, then run Step 2 below to insert the profile rows.
--
-- Accounts to create in Dashboard:
--   Email: dev.user1@sage.test    Password: devuser1sage
--   Email: dev.user2@sage.test    Password: devuser2sage
--   Email: dev.user3@sage.test    Password: devuser3sage
--   Email: dev.admin@sage.test    Password: devadminsage
--
-- After creating the auth users, copy their UUIDs and paste below.

-- Step 2: Insert user profiles
-- Replace the UUIDs below with the actual UUIDs from auth.users after creating them.

-- You can look up the UUIDs with:
-- SELECT id, email FROM auth.users WHERE email LIKE 'dev.%@sage.test';

-- Then run:

INSERT INTO users (id, name, email, status, role, referral_code, referred_by)
SELECT
  id,
  CASE email
    WHEN 'dev.user1@sage.test' THEN 'Test Athlete One'
    WHEN 'dev.user2@sage.test' THEN 'Test Athlete Two'
    WHEN 'dev.user3@sage.test' THEN 'Test Athlete Three'
    WHEN 'dev.admin@sage.test' THEN 'Dev Admin'
  END,
  email,
  'active'::user_status,
  CASE email
    WHEN 'dev.admin@sage.test' THEN 'admin'
    ELSE 'athlete'
  END::user_role,
  CASE email
    WHEN 'dev.user1@sage.test' THEN 'TEST-U1'
    WHEN 'dev.user2@sage.test' THEN 'TEST-U2'
    WHEN 'dev.user3@sage.test' THEN 'TEST-U3'
    WHEN 'dev.admin@sage.test' THEN 'TEST-AD'
  END,
  NULL
FROM auth.users
WHERE email IN ('dev.user1@sage.test', 'dev.user2@sage.test', 'dev.user3@sage.test', 'dev.admin@sage.test')
ON CONFLICT (id) DO NOTHING;

-- Verify:
-- SELECT id, name, email, role, status FROM users WHERE email LIKE 'dev.%@sage.test';
