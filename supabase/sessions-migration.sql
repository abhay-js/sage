-- ============================================================
-- Sessions Migration — run in Supabase SQL Editor
-- ============================================================

-- 1. Expand the status constraint to include pending + rejected
ALTER TABLE session_enrollments
  DROP CONSTRAINT IF EXISTS session_enrollments_status_check;

ALTER TABLE session_enrollments
  ADD CONSTRAINT session_enrollments_status_check
  CHECK (status IN ('pending', 'enrolled', 'attended', 'no_show', 'cancelled', 'rejected'));

-- 2. Trigger to auto-sync current_count on the session
--    Counts only accepted athletes (enrolled / attended / no_show)
CREATE OR REPLACE FUNCTION sync_session_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE group_sessions
  SET current_count = (
    SELECT COUNT(*) FROM session_enrollments
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
      AND status IN ('enrolled', 'attended', 'no_show')
  )
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_session_count_trigger ON session_enrollments;
CREATE TRIGGER sync_session_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON session_enrollments
  FOR EACH ROW EXECUTE FUNCTION sync_session_count();
