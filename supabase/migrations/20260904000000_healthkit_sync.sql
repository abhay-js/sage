-- Preserve the exact HealthKit start timestamp while retaining activity_date
-- for compatibility with existing race scoring and activity screens.
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS activity_started_at timestamptz;

CREATE INDEX IF NOT EXISTS activity_logs_user_started_at_idx
  ON activity_logs (user_id, activity_started_at DESC);
