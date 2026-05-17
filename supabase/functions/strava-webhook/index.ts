import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeScore, refreshTokenIfNeeded, activityToLog } from '../_shared/scoring.ts';

serve(async (req) => {
  // Strava webhook verification handshake (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = url.searchParams.get('hub.verify_token');
    if (verifyToken !== Deno.env.get('STRAVA_WEBHOOK_VERIFY_TOKEN')) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response(JSON.stringify({ 'hub.challenge': challenge }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const event = await req.json();

    // Only process activity create/update events
    if (event.object_type !== 'activity' || !['create', 'update'].includes(event.aspect_type)) {
      return new Response('OK');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find user by Strava athlete ID
    const { data: user } = await supabase
      .from('users')
      .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at')
      .eq('strava_athlete_id', String(event.owner_id))
      .single();

    if (!user) return new Response('User not found', { status: 404 });

    const accessToken = await refreshTokenIfNeeded(user, supabase);

    // Fetch full activity from Strava
    const actRes = await fetch(
      `https://www.strava.com/api/v3/activities/${event.object_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const activity = await actRes.json();
    if (activity.errors) return new Response('Activity fetch failed', { status: 400 });

    // Upsert activity log
    await supabase.from('activity_logs')
      .upsert(activityToLog(activity, user.id), { onConflict: 'strava_activity_id' });

    // Recalculate scores for all of user's races
    const [{ data: entries }, { data: allLogs }] = await Promise.all([
      supabase.from('entries').select('race_id, bonus_points, race:races(*)').eq('user_id', user.id),
      supabase.from('activity_logs').select('*').eq('user_id', user.id),
    ]);

    for (const entry of (entries ?? [])) {
      const scores = computeScore(allLogs ?? [], entry.race as any, entry.bonus_points ?? 0);
      await supabase.from('entries').update(scores)
        .eq('user_id', user.id).eq('race_id', entry.race_id);
    }

    return new Response('OK');
  } catch (e: any) {
    console.error('Webhook error:', e.message);
    return new Response(e.message, { status: 500 });
  }
});
