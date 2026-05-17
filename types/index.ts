export type UserStatus = 'pending' | 'active' | 'suspended';
export type UserRole = 'athlete' | 'influencer' | 'admin';
export type RaceStatus = 'draft' | 'open' | 'closed';
export type ReferralStatus = 'pending' | 'rewarded' | 'void';

export interface User {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  role: UserRole;
  referral_code: string;
  referred_by: string | null;
  plan_expires_at: string | null;
  strava_athlete_id: string | null;
  strava_access_token: string | null;
  strava_refresh_token: string | null;
  strava_token_expires_at: string | null;
  payment_screenshot_url: string | null;
}

export interface Race {
  id: string;
  created_at: string;
  name: string;
  city: string | null;
  sport_types: string[];
  race_date: string;
  challenge_start: string;
  challenge_end: string;
  status: RaceStatus;
  entry_fee: number | null;
}

export interface Entry {
  id: string;
  created_at: string;
  user_id: string;
  race_id: string;
  sage_score: number;
  sessions: number;
  total_hours: number;
  streak: number;
  bonus_points: number;
  user?: User;
  race?: Race;
}

export interface ActivityLog {
  id: string;
  created_at: string;
  user_id: string;
  strava_activity_id: string;
  sport_type: string;
  activity_name: string;
  activity_date: string;
  moving_time_secs: number;
  elapsed_time_secs: number;
  distance_meters: number | null;
  avg_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
  calories: number | null;
  elevation_gain: number | null;
  avg_speed: number | null;
}

export interface Referral {
  id: string;
  created_at: string;
  referrer_id: string;
  referred_id: string;
  status: ReferralStatus;
  cash_paid: boolean;
  points_granted: boolean;
  referred_user?: User;
}

export interface LeaderboardEntry extends Entry {
  rank: number;
  user: User;
}

export type SessionStatus = 'draft' | 'open' | 'full' | 'completed' | 'archived' | 'cancelled';

export interface GroupSession {
  id: string;
  created_at: string;
  host_id: string;
  title: string;
  description: string | null;
  sport_type: string;
  session_date: string;
  start_time: string;
  meeting_point: string | null;
  route_link: string | null;
  distance_km: number | null;
  duration_mins: number | null;
  max_participants: number;
  current_count: number;
  whatsapp_link: string | null;
  map_link: string | null;
  latitude: number | null;
  longitude: number | null;
  visibility: 'public' | 'private';
  status: SessionStatus;
  min_ftp: number | null;
  avg_speed_kmh: number | null;
  elevation_gain_m: number | null;
  ride_type: string | null;
  min_pace: string | null;
  surface_type: string | null;
  workout_type: string | null;
  host?: User;
}

export interface SessionEnrollment {
  id: string;
  created_at: string;
  session_id: string;
  user_id: string;
  status: 'pending' | 'enrolled' | 'attended' | 'no_show' | 'cancelled' | 'rejected';
  user?: User;
}
