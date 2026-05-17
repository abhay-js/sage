export const SCORE_PER_SESSION = 10;
export const SCORE_PER_HOUR = 15;
export const STREAK_BONUS_7D = 50;
export const STREAK_BONUS_30D = 200;

export function computeScore(
  logs: any[],
  race: any,
  bonusPoints: number
) {
  const start = new Date(race.challenge_start).getTime();
  const end = new Date(race.challenge_end).getTime();

  const qualifying = logs.filter((a) => {
    const t = new Date(a.activity_date).getTime();
    return race.sport_types.includes(a.sport_type) && t >= start && t <= end;
  });

  const sessions = qualifying.length;
  const total_hours = qualifying.reduce((s: number, a: any) => s + a.moving_time_secs / 3600, 0);

  // Streak = consecutive days with at least one activity up to today
  const daySet = new Set(qualifying.map((a: any) => a.activity_date.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
    } else if (streak > 0) {
      break;
    }
  }

  const streak_bonus = streak >= 30 ? STREAK_BONUS_30D : streak >= 7 ? STREAK_BONUS_7D : 0;
  const sage_score =
    sessions * SCORE_PER_SESSION +
    Math.floor(total_hours * SCORE_PER_HOUR) +
    streak_bonus +
    bonusPoints;

  return { sage_score, sessions, total_hours, streak };
}

export async function refreshTokenIfNeeded(
  user: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(user.strava_token_expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return user.strava_access_token;

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('STRAVA_CLIENT_ID'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
      refresh_token: user.strava_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await res.json();

  await supabase.from('users').update({
    strava_access_token: tokens.access_token,
    strava_refresh_token: tokens.refresh_token,
    strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
  }).eq('id', user.id);

  return tokens.access_token;
}

const SPORT_NORMALIZER: Record<string, string> = {
  'Run': 'Run', 'TrailRun': 'Run', 'VirtualRun': 'Run', 'Treadmill': 'Run',
  'Ride': 'Ride', 'VirtualRide': 'Ride', 'EBikeRide': 'Ride',
  'MountainBikeRide': 'Ride', 'GravelRide': 'Ride', 'Handcycle': 'Ride',
  'Swim': 'Swim', 'OpenWaterSwim': 'Swim',
  'Walk': 'Walk', 'Hike': 'Hike',
  'WeightTraining': 'WeightTraining', 'Workout': 'Workout',
  'Yoga': 'Yoga', 'Rowing': 'Rowing', 'Kayaking': 'Kayaking',
  'Soccer': 'Soccer', 'Tennis': 'Tennis', 'Crossfit': 'Crossfit',
};

export function normalizeSportType(raw: string | undefined | null): string {
  if (!raw) return 'Workout';
  return SPORT_NORMALIZER[raw] ?? raw;
}

export function activityToLog(a: any, userId: string) {
  return {
    user_id: userId,
    strava_activity_id: String(a.id),
    sport_type: normalizeSportType(a.sport_type ?? a.type),
    activity_name: a.name,
    activity_date: a.start_date,
    moving_time_secs: a.moving_time,
    elapsed_time_secs: a.elapsed_time,
    distance_meters: a.distance ?? null,
    avg_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    suffer_score: a.suffer_score ?? null,
    calories: a.calories ?? null,
    elevation_gain: a.total_elevation_gain ?? null,
    avg_speed: a.average_speed ?? null,
  };
}
