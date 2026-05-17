-- Mark a session as completed.
-- Auto-marks all still-enrolled athletes as 'attended' (anyone not explicitly
-- marked no_show is assumed to have attended). Locks all further changes.
CREATE OR REPLACE FUNCTION host_complete_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM group_sessions WHERE id = p_session_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Everyone still 'enrolled' at completion time → attended
  UPDATE session_enrollments
    SET status = 'attended'
  WHERE session_id = p_session_id AND status = 'enrolled';

  -- Sync the final count (attended only — no_shows don't occupy a spot anymore)
  UPDATE group_sessions
    SET status = 'completed',
        current_count = (
          SELECT COUNT(*) FROM session_enrollments
          WHERE session_id = p_session_id AND status = 'attended'
        )
  WHERE id = p_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION host_complete_session(uuid) TO authenticated;
