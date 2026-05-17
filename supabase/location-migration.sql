-- Add coordinates to group_sessions for proximity search
ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS latitude  numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;
