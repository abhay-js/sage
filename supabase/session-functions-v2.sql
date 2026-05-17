-- ============================================================
-- Session Functions v2 — run in Supabase SQL Editor
-- ============================================================

-- Add map_link column for start point
ALTER TABLE group_sessions ADD COLUMN IF NOT EXISTS map_link text;

-- Undo a rejection (host puts athlete back to pending)
CREATE OR REPLACE FUNCTION host_undo_rejection(p_enrollment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session_id uuid;
BEGIN
  SELECT session_id INTO v_session_id FROM session_enrollments WHERE id = p_enrollment_id;
  IF NOT EXISTS (SELECT 1 FROM group_sessions WHERE id = v_session_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE session_enrollments SET status = 'pending' WHERE id = p_enrollment_id AND status = 'rejected';
END;
$$;
GRANT EXECUTE ON FUNCTION host_undo_rejection(uuid) TO authenticated;

-- Re-activate an archived session: cancels ALL enrollments, resets count to 0
-- Athletes must request again fresh
CREATE OR REPLACE FUNCTION host_reactivate_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM group_sessions WHERE id = p_session_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Cancel every enrollment (pending, enrolled, attended, no_show, rejected)
  UPDATE session_enrollments
    SET status = 'cancelled'
  WHERE session_id = p_session_id AND status != 'cancelled';
  -- Reset session to open with zero spots taken
  UPDATE group_sessions
    SET status = 'open', current_count = 0
  WHERE id = p_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION host_reactivate_session(uuid) TO authenticated;
