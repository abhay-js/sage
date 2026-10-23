// Read-only smoke test against the configured backend, using seeded test accounts.
globalThis.WebSocket = require('ws');
const fs = require('fs');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n')
  .filter(line => line.includes('=') && !line.startsWith('#'))
  .map(line => { const i = line.indexOf('='); return [line.slice(0,i), line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]; }));
async function check(email, password, isAdmin) {
  const client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  try {
    const result = await client.rpc('admin_workouts', { p_status: 'all', p_limit: 1, p_offset: 0, p_search: '', p_user_id: null });
    if (isAdmin) {
      if (result.error) throw result.error;
      assert(Array.isArray(result.data.workouts));
      console.log('PASS: admin workout listing; total workouts:', result.data.total);
    } else {
      assert.equal(result.error?.code, '42501');
      console.log('PASS: athlete cannot access admin workout listing');
    }
    const levels = await client.rpc('admin_level_overview');
    if(isAdmin) { if(levels.error) throw levels.error; assert(Array.isArray(levels.data.athletes)); console.log('PASS: admin levels API; athletes:',levels.data.athletes.length,'races:',levels.data.races.length); }
    else { assert.equal(levels.error?.code,'42501'); console.log('PASS: athlete cannot access admin levels API'); }

    const submissions=await client.rpc('sage_submissions',{p_admin:isAdmin,p_status:'pending'});if(submissions.error)throw submissions.error;assert(Array.isArray(submissions.data.submissions));
    if(!isAdmin){const denied=await client.rpc('sage_submissions',{p_admin:true});assert.equal(denied.error?.code,'42501');}
    const invalid=await client.functions.invoke('submit-workout',{body:{source:'strava_link',url:'https://example.com'}});assert(invalid.error);assert.equal(invalid.error.context.status,400);assert.match((await invalid.error.context.json()).error,/Paste a Strava/);
    const gpsInvalid=await client.functions.invoke('submit-workout',{body:{source:'gps',file_path:'another-account/run.json'}});assert(gpsInvalid.error);assert.equal(gpsInvalid.error.context.status,400);assert.match((await gpsInvalid.error.context.json()).error,/your own GPS/);
    console.log('PASS: live submissions API, admin guard, invalid-link and cross-owner GPS upload rejection');
    const profile=await client.rpc('sage_profile');if(profile.error)throw profile.error;assert(Array.isArray(profile.data.levels));
    const catalog=await client.rpc('sage_challenges',{p_admin:isAdmin});if(catalog.error)throw catalog.error;assert(Array.isArray(catalog.data));
    if(catalog.data.length){const raceId=catalog.data[0].id;
      const [around,board]=await Promise.all([client.rpc('sage_around_me',{p_race_id:raceId}),client.rpc('sage_leaderboard',{p_race_id:raceId,p_limit:50})]);
      if(around.error)throw around.error;if(board.error)throw board.error;assert(board.data.athletes.length<=50);
    }
    if(isAdmin&&levels.data.athletes.length){const analysis=await client.rpc('sage_athlete_analysis',{p_user_id:levels.data.athletes[0].id});if(analysis.error)throw analysis.error;assert(analysis.data.workouts.length<=90);assert(Array.isArray(analysis.data.weekly));}
    if(!isAdmin){
      const rows=await client.from('users').select('id');if(rows.error)throw rows.error;assert(rows.data.every(u=>u.id===login.data.user.id));
      const logs=await client.from('activity_logs').select('user_id').limit(500);if(logs.error)throw logs.error;assert(logs.data.every(a=>a.user_id===login.data.user.id));
      const audits=await client.rpc('sage_workout_scores');if(audits.error)throw audits.error;
    }
    console.log('PASS: live product profile, challenge config, board/window, analysis and private-data isolation for',isAdmin?'admin':'athlete');
  } finally { await client.auth.signOut({ scope: 'local' }); }
}
(async () => {
  await check('dev.admin@sage.test', 'devadminsage', true);
  await check('dev.user1@sage.test', 'devuser1sage', false);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
