CREATE TABLE race_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  race_id uuid REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE race_tips ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read tips
CREATE POLICY "Read tips" ON race_tips
  FOR SELECT TO authenticated USING (true);

-- Only admins can create / update / delete
CREATE POLICY "Admin manages tips" ON race_tips
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
