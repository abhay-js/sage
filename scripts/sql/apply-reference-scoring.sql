-- Apply the supplied reference to the published Ironman challenge only.
-- Preserve its sports, dates, eligibility, description, rewards and rule copy.
BEGIN;
CREATE TEMP TABLE sage_reference_before ON COMMIT DROP AS
 SELECT race_id,config,revision FROM public.sage_challenge_configs
 WHERE race_id='daae34d4-bd68-41b6-ae1e-0b874766852b';
DO $apply$
DECLARE participant uuid; cfg jsonb;
BEGIN
 SELECT c.config INTO cfg FROM public.sage_challenge_configs c JOIN public.races r ON r.id=c.race_id
 WHERE r.id='daae34d4-bd68-41b6-ae1e-0b874766852b' AND r.status::text='open' AND r.sport_types=ARRAY['Run','Ride','Swim'] AND c.revision=1 AND c.config->>'scoringMode'='LEGACY' FOR UPDATE OF c,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Challenge has changed; inspect its configuration before applying'; END IF;
 UPDATE public.sage_challenge_configs SET config=config||$config${"scoringMode":"THRESHOLD","maxWorkoutsPerDay":2,"scoringRules":[{"id":"reference-Run-3","sport":"Run","threshold":3,"points":5,"unit":"KM","order":0},{"id":"reference-Run-5","sport":"Run","threshold":5,"points":10,"unit":"KM","order":1},{"id":"reference-Run-10","sport":"Run","threshold":10,"points":25,"unit":"KM","order":2},{"id":"reference-Run-15","sport":"Run","threshold":15,"points":40,"unit":"KM","order":3},{"id":"reference-Run-20","sport":"Run","threshold":20,"points":55,"unit":"KM","order":4},{"id":"reference-Ride-10","sport":"Ride","threshold":10,"points":5,"unit":"KM","order":0},{"id":"reference-Ride-20","sport":"Ride","threshold":20,"points":10,"unit":"KM","order":1},{"id":"reference-Ride-40","sport":"Ride","threshold":40,"points":25,"unit":"KM","order":2},{"id":"reference-Ride-60","sport":"Ride","threshold":60,"points":40,"unit":"KM","order":3},{"id":"reference-Ride-100","sport":"Ride","threshold":100,"points":65,"unit":"KM","order":4},{"id":"reference-Swim-500","sport":"Swim","threshold":500,"points":5,"unit":"METERS","order":0},{"id":"reference-Swim-1000","sport":"Swim","threshold":1000,"points":12,"unit":"METERS","order":1},{"id":"reference-Swim-2000","sport":"Swim","threshold":2000,"points":25,"unit":"METERS","order":2},{"id":"reference-Swim-3000","sport":"Swim","threshold":3000,"points":40,"unit":"METERS","order":3},{"id":"reference-Swim-4000","sport":"Swim","threshold":4000,"points":55,"unit":"METERS","order":4}],"bonuses":[{"id":"reference-early-bird","type":"EARLY_BIRD","title":"Early Bird","description":"Start a qualifying workout before 7 AM (Asia/Kolkata).","points":5,"maxUses":1,"metadata":{"hour":7}},{"id":"reference-three-day-streak","type":"STREAK","title":"3 Day Streak","description":"Complete qualifying workouts on three consecutive days.","points":10,"maxUses":1,"metadata":{"days":3}},{"id":"reference-outdoor-ride","type":"OUTDOOR","title":"Outdoor Ride","description":"Complete a verified outdoor ride.","points":5,"maxUses":1,"metadata":{}}]}$config$::jsonb,revision=revision+1,updated_at=now()
 WHERE race_id='daae34d4-bd68-41b6-ae1e-0b874766852b';
 FOR participant IN SELECT DISTINCT user_id FROM public.entries WHERE race_id='daae34d4-bd68-41b6-ae1e-0b874766852b' ORDER BY user_id LOOP
  PERFORM sage_review_private.sage_recalculate(participant);
 END LOOP;
 SELECT config INTO cfg FROM public.sage_challenge_configs WHERE race_id='daae34d4-bd68-41b6-ae1e-0b874766852b';
 IF jsonb_array_length(cfg->'scoringRules')<>15 OR cfg->>'scoringMode'<>'THRESHOLD' OR (cfg->>'maxWorkoutsPerDay')::int<>2
 OR sage_review_private.sage_base_points(cfg,'Run',10000,3600)<>25
 OR sage_review_private.sage_base_points(cfg,'Ride',100000,18000)<>65
 OR sage_review_private.sage_base_points(cfg,'Swim',4000,7200)<>55 THEN
 RAISE EXCEPTION 'Reference scoring verification failed';END IF;
END;$apply$;
SELECT b.config AS previous_config,c.config AS updated_config,c.revision,
 (SELECT count(*) FROM public.entries WHERE race_id=c.race_id) AS recalculated_participants,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('entry_id',e.id,'score',e.sage_score,'sessions',e.sessions)),'[]'::jsonb) FROM public.entries e WHERE e.race_id=c.race_id) AS results
FROM public.sage_challenge_configs c JOIN sage_reference_before b USING(race_id);
COMMIT;
