-- Fix: Allow session host to update enrollments in their own sessions
-- (accept/reject requests, mark attendance)
CREATE POLICY "Host can manage enrollments"
  ON session_enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_sessions
      WHERE id = session_enrollments.session_id
        AND host_id = auth.uid()
    )
  );
