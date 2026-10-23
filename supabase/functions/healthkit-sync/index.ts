import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  endOfDate,
  isInsideCurrentRace,
  isStravaSource,
  supportedTypes,
  validateWorkout,
  type Race,
  type WorkoutUpload,
} from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authentication required' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Invalid session' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin
      .from('users')
      .select('id, status, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.status !== 'active' || profile.role !== 'athlete') {
      return json({ error: 'An active Sage athlete membership is required' }, 403);
    }

    const body = await req.json();
    const races = await currentRaces(admin, user.id);
    if (body.action === 'prepare') {
      const syncFrom = races.length
        ? races.map((race) => race.challenge_start).sort()[0]
        : null;
      return json({ syncFrom, activeRaceCount: races.length });
    }
    if (body.action !== 'upload') return json({ error: 'Unknown action' }, 400);
    if (!Array.isArray(body.workouts) || body.workouts.length > 200) {
      return json({ error: 'workouts must be an array of at most 200 records' }, 400);
    }

    const parsed = body.workouts.map(validateWorkout);
    const unique = new Map<string, WorkoutUpload>();
    let skipped = 0;
    for (const workout of parsed) {
      if (isStravaSource(workout) || !isInsideCurrentRace(workout, races)) {
        skipped++;
        continue;
      }
      if (unique.has(workout.id)) skipped++;
      unique.set(workout.id, workout);
    }

    const workouts = [...unique.values()];
    const externalIds = workouts.map((workout) => `health_ios_${workout.id}`);
    const { data: existing } = externalIds.length
      ? await admin.from('activity_logs').select('strava_activity_id')
        .eq('user_id', user.id).in('strava_activity_id', externalIds)
      : { data: [] as { strava_activity_id: string }[] };
    const existingIds = new Set((existing ?? []).map((row) => row.strava_activity_id));
    const rows = workouts.map((workout) => {
      const sport = supportedTypes[workout.type];
      return {
        user_id: user.id,
        strava_activity_id: `health_ios_${workout.id}`,
        sport_type: sport,
        activity_name: `Apple Health ${sport}`,
        activity_date: workout.startedAt,
        activity_started_at: workout.startedAt,
        moving_time_secs: Math.round(workout.durationSeconds),
        elapsed_time_secs: Math.max(
          0,
          Math.round((Date.parse(workout.endedAt) - Date.parse(workout.startedAt)) / 1000),
        ),
        distance_meters: workout.distanceMeters,
        avg_heartrate: workout.averageHeartRate,
        max_heartrate: null,
        suffer_score: null,
        calories: workout.calories,
        elevation_gain: null,
        avg_speed: workout.distanceMeters && workout.durationSeconds
          ? workout.distanceMeters / workout.durationSeconds
          : null,
      };
    });

    if (rows.length) {
      const { error } = await admin.from('activity_logs').upsert(rows, {
        onConflict: 'strava_activity_id',
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }

    const scoresUpdated = await recalculateScores(admin, user.id);
    const inserted = externalIds.filter((id) => !existingIds.has(id)).length;
    return json({
      ok: true,
      received: body.workouts.length,
      inserted,
      updated: rows.length - inserted,
      skipped,
      scoresUpdated,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('HealthKit sync error', error);
    return json({ error: error instanceof Error ? error.message : 'Sync failed' }, 400);
  }
});

async function currentRaces(admin: any, userId: string): Promise<Race[]> {
  const { data, error } = await admin.from('entries')
    .select('race:races(id, status, challenge_start, challenge_end, sport_types)')
    .eq('user_id', userId);
  if (error) throw error;
  const now = Date.now();
  return (data ?? [])
    .map((entry: any) => entry.race as Race | null)
    .filter((race: Race | null): race is Race => Boolean(
      race && race.status === 'open' &&
      now >= Date.parse(race.challenge_start) && now <= endOfDate(race.challenge_end),
    ));
}

async function recalculateScores(admin: any, userId: string): Promise<number> {
  const {error}=await admin.rpc('sage_process_workouts',{p_user_id:userId});
  if(error)throw error;
  const {count}=await admin.from('entries').select('id',{head:true,count:'exact'}).eq('user_id',userId);
  return count??0;
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
