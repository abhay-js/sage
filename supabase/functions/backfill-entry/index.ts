import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refreshTokenIfNeeded, activityToLog } from '../_shared/scoring.ts';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'};
serve(async (req) => {
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try {
    const { user_id, race_id } = await req.json();
    if (!user_id || !race_id) {
      return json({ error: 'user_id and race_id required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const bearer=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
    if(!bearer)return json({error:'Authentication required'},401);
    const {data:{user:caller},error:authError}=await supabase.auth.getUser(bearer);
    if(authError||!caller)return json({error:'Invalid session'},401);
    if(caller.id!==user_id){
      const {data:identity}=await supabase.from('users').select('role').eq('id',caller.id).single();
      if(identity?.role!=='admin')return json({error:'Forbidden'},403);
    }
    // Load user + race in parallel
    const [{ data: user }, { data: race }] = await Promise.all([
      supabase.from('users')
        .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at')
        .eq('id', user_id).single(),
      supabase.from('races').select('*').eq('id', race_id).single(),
    ]);

    if (!user?.strava_access_token) return json({ error: 'No Strava token' }, 400);
    if (!race) return json({ error: 'Race not found' }, 404);

    const accessToken = await refreshTokenIfNeeded(user, supabase);

    // ── Incremental sync: only fetch activities newer than what we already have ──
    // This avoids re-fetching the full history every time someone joins a new race,
    // staying well within Strava's 200 req/15min rate limit.
    const { data: latestLog } = await supabase
      .from('activity_logs')
      .select('activity_date')
      .eq('user_id', user_id)
      .order('activity_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const raceStartEpoch = Math.floor(new Date(race.challenge_start).getTime() / 1000);
    let fetchAfterEpoch: number;

    if (latestLog?.activity_date) {
      // Already have data — fetch from 1 day before our latest (buffer for edited/late activities)
      // but never before race start (no scoring value outside the window)
      const latestEpoch = Math.floor(new Date(latestLog.activity_date).getTime() / 1000) - 86400;
      fetchAfterEpoch = Math.max(raceStartEpoch, latestEpoch);
    } else {
      // First sync ever — full fetch from race start
      fetchAfterEpoch = raceStartEpoch;
    }

    let activities: any[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${fetchAfterEpoch}&page=${page}&per_page=200`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      activities = [...activities, ...batch];
      if (batch.length < 200) break;
      page++;
    }

    if (activities.length > 0) {
      await supabase.from('activity_logs')
        .upsert(activities.map((a) => activityToLog(a, user_id)), {
          onConflict: 'strava_activity_id',
          ignoreDuplicates: false,
        });
    }

    const {error:scoreError}=await supabase.rpc('sage_process_workouts',{p_user_id:user_id});
    if(scoreError)throw scoreError;
    return json({ok:true,fetched:activities.length});
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
