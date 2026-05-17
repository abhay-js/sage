-- ============================================================
-- Host control functions — SECURITY DEFINER bypasses RLS
-- Run this in Supabase SQL Editor
-- ============================================================

-- Accept a pending request
CREATE OR REPLACE FUNCTION host_accept_request(p_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  SELECT session_id INTO v_session_id
  FROM session_enrollments WHERE id = p_enrollment_id;

  IF NOT EXISTS (
    SELECT 1 FROM group_sessions
    WHERE id = v_session_id AND host_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized: you are not the host of this session';
  END IF;

  UPDATE session_enrollments
    SET status = 'enrolled'
  WHERE id = p_enrollment_id AND status = 'pending';

  -- Sync spot count
  UPDATE group_sessions
    SET current_count = (
      SELECT COUNT(*) FROM session_enrollments
      WHERE session_id = v_session_id
        AND status IN ('enrolled', 'attended', 'no_show')
    )
  WHERE id = v_session_id;
END;
$$;

-- Reject a pending request
CREATE OR REPLACE FUNCTION host_reject_request(p_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  SELECT session_id INTO v_session_id
  FROM session_enrollments WHERE id = p_enrollment_id;

  IF NOT EXISTS (
    SELECT 1 FROM group_sessions
    WHERE id = v_session_id AND host_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized: you are not the host of this session';
  END IF;

  UPDATE session_enrollments
    SET status = 'rejected'
  WHERE id = p_enrollment_id;
END;
$$;

-- Mark attendance (attended / no_show / enrolled)
CREATE OR REPLACE FUNCTION host_mark_attendance(p_enrollment_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF p_status NOT IN ('enrolled', 'attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT session_id INTO v_session_id
  FROM session_enrollments WHERE id = p_enrollment_id;

  IF NOT EXISTS (
    SELECT 1 FROM group_sessions
    WHERE id = v_session_id AND host_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized: you are not the host of this session';
  END IF;

  UPDATE session_enrollments
    SET status = p_status
  WHERE id = p_enrollment_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION host_accept_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION host_reject_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION host_mark_attendance(uuid, text) TO authenticated;
