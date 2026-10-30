BEGIN;
CREATE TEMP TABLE dawn_profiles_before AS SELECT user_id,md5(to_jsonb(p)::text) digest FROM public.athlete_profiles p;
CREATE TEMP TABLE dawn_scores_before AS SELECT id,sage_score,level_at_join FROM public.entries;
CREATE TEMP TABLE dawn_levels_before AS SELECT user_id,level FROM public.athlete_levels;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.users WHERE email='dev.user1@sage.test'),true);
CREATE TEMP TABLE dawn_owner_before AS SELECT to_jsonb(p) profile FROM public.athlete_profiles p WHERE user_id=auth.uid();
GRANT SELECT ON dawn_owner_before TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ DECLARE original jsonb; payload jsonb; answers jsonb; saved jsonb; invalid jsonb; accepted boolean; BEGIN
 SELECT profile INTO original FROM dawn_owner_before;
 IF original IS NULL THEN RAISE EXCEPTION 'Development athlete required'; END IF;
 payload:=original||'{"age":27,"gender":"Man","sports":["RUN","RIDE","SWIM","TRIATHLON","HYROX"],"primary_sport":"RUN","benchmarks":{"RUN":{"distanceKm":10,"timeSeconds":3360},"RIDE":{"ftp":220},"SWIM":{"skipped":true},"TRIATHLON":{"skipped":true},"HYROX":{"count":6,"division":"Singles","timeSeconds":4800}}}'::jsonb;
 answers:='{"version":2,"runLongest":"10k","hyCount":6,"hyDivs":["open","pro"],"triDone":["sprint","olympic"],"swimLongest":"2k","swimK":"20-25","ftpKnown":"yes","ftp":220,"rideLongest":null,"days":4,"src":"garmin","pb":{"10k":56,"hy_pro":80,"olympic":170},"skip":{},"skippedSports":[]}'::jsonb;
 PERFORM public.sage_save_dawn_profile(payload,answers,false);
 saved:=public.sage_profile()->'profile';
 IF saved->'dawn_answers' IS DISTINCT FROM answers OR saved->'benchmarks' IS DISTINCT FROM payload->'benchmarks' THEN RAISE EXCEPTION 'Dawn answers did not round-trip'; END IF;
 IF saved->'avatar' IS DISTINCT FROM original->'avatar' OR saved->'profile_image_url' IS DISTINCT FROM original->'profile_image_url' OR saved->'goal_name' IS DISTINCT FROM original->'goal_name' OR saved->'onboarding_completed' IS DISTINCT FROM original->'onboarding_completed' OR saved->'date_of_birth' IS DISTINCT FROM original->'date_of_birth' THEN RAISE EXCEPTION 'Unrelated profile data changed'; END IF;
 FOR invalid IN SELECT value FROM jsonb_array_elements('[{"version":3},{"version":"2"},{"days":0},{"days":8},{"days":3.5},{"days":"4"},{"ftp":601},{"hyCount":1000},{"hyDivs":["pro","pro"]},{"hyDivs":["invented"]},{"triDone":["other"]},{"src":"invented"},{"runLongest":null},{"swimK":null},{"pb":{}},{"skip":{"10k":"yes"}},{"pb":{"10k":0}},{"pb":{"10k":3000}},{"pb":{"other":50}},{"level":99},{"skippedSports":["invented"]}]'::jsonb) LOOP
  accepted:=false;
  BEGIN PERFORM public.sage_save_dawn_profile(payload,answers||invalid,false);accepted:=true;EXCEPTION WHEN raise_exception THEN NULL; END;
  IF accepted THEN RAISE EXCEPTION 'Invalid Dawn answers accepted: %',invalid; END IF;
 END LOOP;
 PERFORM public.sage_save_dawn_profile(payload,answers||'{"hyCount":0,"hyDivs":[],"triDone":[],"runLongest":null,"swimK":null,"ftpKnown":null,"pb":{},"skippedSports":["run","tri","swim","ride"]}',true);
 IF public.sage_profile()->'profile'->>'onboarding_completed'<>'true' THEN RAISE EXCEPTION 'Completion not saved'; END IF;
 PERFORM public.sage_save_dawn_profile(payload,answers,false);
 IF public.sage_profile()->'profile'->>'onboarding_completed'<>'true' THEN RAISE EXCEPTION 'Editing reset completion'; END IF;
END;$$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.athlete_profiles p JOIN dawn_profiles_before b USING(user_id) WHERE p.user_id<>auth.uid() AND md5(to_jsonb(p)::text)<>b.digest) THEN RAISE EXCEPTION 'Another athlete was changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.entries e JOIN dawn_scores_before b USING(id) WHERE e.sage_score IS DISTINCT FROM b.sage_score OR e.level_at_join IS DISTINCT FROM b.level_at_join) OR EXISTS(SELECT 1 FROM public.athlete_levels l JOIN dawn_levels_before b USING(user_id) WHERE l.level IS DISTINCT FROM b.level) THEN RAISE EXCEPTION 'Score or level changed'; END IF;
 IF has_function_privilege('anon','public.sage_save_dawn_profile(jsonb,jsonb,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous save exposed'; END IF;
END;$$;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE accepted boolean:=false;BEGIN BEGIN PERFORM public.sage_save_dawn_profile('{}','{}',false);accepted:=true;EXCEPTION WHEN insufficient_privilege THEN NULL;END;IF accepted THEN RAISE EXCEPTION 'Signed-out save accepted';END IF;END;$$;
RESET ROLE;
SELECT 'PASS: Dawn answer round-trip, validation, optional benchmarks, completion, metadata preservation, owner isolation, unchanged scores and levels, anonymous denial. All writes rolled back.' AS result;
ROLLBACK;
