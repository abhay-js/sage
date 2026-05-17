-- Group Sessions table
CREATE TABLE group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  host_id uuid REFERENCES users(id) NOT NULL,
  title text NOT NULL,
  description text,
  sport_type text NOT NULL CHECK (sport_type IN ('Ride', 'Run', 'Swim', 'Trail')),
  session_date date NOT NULL,
  start_time time NOT NULL,
  meeting_point text,
  route_link text,
  distance_km numeric,
  duration_mins integer,
  max_participants integer NOT NULL DEFAULT 20,
  current_count integer NOT NULL DEFAULT 0,
  whatsapp_link text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'full', 'completed', 'archived', 'cancelled')),
  -- Cycling specific
  min_ftp integer,
  avg_speed_kmh numeric,
  elevation_gain_m integer,
  ride_type text CHECK (ride_type IN ('recovery', 'endurance', 'tempo', 'race_pace', 'climbing', 'social')),
  -- Running specific
  min_pace text,
  surface_type text CHECK (surface_type IN ('road', 'trail', 'track')),
  workout_type text CHECK (workout_type IN ('easy', 'long', 'intervals', 'tempo', 'race_simulation'))
);

-- Session enrollments table
CREATE TABLE session_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  session_id uuid REFERENCES group_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'no_show', 'cancelled')),
  UNIQUE(session_id, user_id)
);

-- RLS Policies
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_enrollments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read open/full sessions
CREATE POLICY "Read open sessions" ON group_sessions
  FOR SELECT TO authenticated USING (status IN ('open', 'full') AND visibility = 'public');

-- Hosts can read their own sessions (all statuses)
CREATE POLICY "Host reads own sessions" ON group_sessions
  FOR SELECT TO authenticated USING (host_id = auth.uid());

-- Authenticated users can create sessions
CREATE POLICY "Create sessions" ON group_sessions
  FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());

-- Hosts can update their own sessions
CREATE POLICY "Update own sessions" ON group_sessions
  FOR UPDATE TO authenticated USING (host_id = auth.uid());

-- Anyone can read enrollments for sessions they're part of
CREATE POLICY "Read enrollments" ON session_enrollments
  FOR SELECT TO authenticated USING (true);

-- Users can enroll themselves
CREATE POLICY "Enroll self" ON session_enrollments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can update their own enrollment (leave/cancel)
CREATE POLICY "Update own enrollment" ON session_enrollments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
