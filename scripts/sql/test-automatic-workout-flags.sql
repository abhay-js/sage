-- Run after the automatic flags migration inside a transaction and roll back.
CREATE TEMP TABLE test_ids AS SELECT (SELECT id FROM public.users WHERE email='dev.admin@sage.test') AS admin_id,(SELECT id FROM public.users WHERE email='dev.user1@sage.test') AS athlete_id;
GRANT SELECT ON test_ids TO authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT athlete_id::text FROM test_ids),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.admin_automatic_workout_flags(); RAISE EXCEPTION 'Athlete could view flags'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END;$$;
SELECT public.sage_join_challenge('71130cb8-a8b9-44d0-abff-999228c8e8b8');
RESET ROLE;
INSERT INTO public.activity_logs(user_id,strava_activity_id,sport_type,activity_name,activity_date,activity_started_at,moving_time_secs,elapsed_time_secs,distance_meters) SELECT athlete_id,'auto_flag_rollback_test','Run','Automatic flag test',now(),now(),600,600,10000 FROM test_ids;
SELECT sage_review_private.sage_recalculate((SELECT athlete_id FROM test_ids));
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM sage_review_private.automatic_workout_flags f JOIN public.activity_logs a ON a.id=f.activity_id WHERE a.strava_activity_id='auto_flag_rollback_test' AND f.resolved_at IS NULL AND array_to_string(f.reasons,',') LIKE '%speed%') THEN RAISE EXCEPTION 'Speed flag missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sage_challenge_activities ca JOIN public.activity_logs a ON a.id=ca.activity_id WHERE a.strava_activity_id='auto_flag_rollback_test' AND ca.race_id='71130cb8-a8b9-44d0-abff-999228c8e8b8' AND ca.status='COUNTED') THEN RAISE EXCEPTION 'Flagged workout did not count'; END IF;
END;$$;
SELECT set_config('request.jwt.claim.sub',(SELECT admin_id::text FROM test_ids),true);
SET LOCAL ROLE authenticated;
SELECT public.review_workout((SELECT id FROM public.activity_logs WHERE strava_activity_id='auto_flag_rollback_test'),'rejected','Test rejection',0);
RESET ROLE;
UPDATE public.activity_logs SET distance_meters=11000 WHERE strava_activity_id='auto_flag_rollback_test';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.activity_logs a JOIN public.workout_reviews r ON r.activity_id=a.id WHERE a.strava_activity_id='auto_flag_rollback_test' AND r.status='rejected') THEN RAISE EXCEPTION 'Rejection did not survive import update'; END IF;
 IF EXISTS(SELECT 1 FROM public.sage_challenge_activities ca JOIN public.activity_logs a ON a.id=ca.activity_id WHERE a.strava_activity_id='auto_flag_rollback_test' AND ca.status='COUNTED') THEN RAISE EXCEPTION 'Rejected workout counted'; END IF;
END;$$;
SELECT 'PASS: flagged workouts count, admin rejection survives sync, and flag access is admin only' AS result;
