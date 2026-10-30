-- Run after the migration in a single transaction. All test writes are rolled back.
BEGIN;
CREATE TEMP TABLE story_profiles_before AS SELECT user_id,md5(to_jsonb(p)::text) digest FROM public.athlete_profiles p;
CREATE TEMP TABLE story_scores_before AS SELECT id,sage_score,level_at_join FROM public.entries;
CREATE TEMP TABLE story_levels_before AS SELECT user_id,level FROM public.athlete_levels;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.users WHERE email='dev.user1@sage.test'),true);
CREATE TEMP TABLE story_owner_before AS SELECT to_jsonb(p) profile FROM public.athlete_profiles p WHERE user_id=auth.uid();
GRANT SELECT ON story_owner_before TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ DECLARE original jsonb; payload jsonb; saved jsonb; invalid jsonb; accepted boolean; BEGIN
 SELECT profile INTO original FROM story_owner_before;
 IF original IS NULL THEN RAISE EXCEPTION 'Development athlete is required for this test'; END IF;
 payload:=original||'{"age":27,"gender":"Man","sports":["RUN","RIDE","SWIM","TRIATHLON","HYROX"],"primary_sport":"RUN","benchmarks":{"RUN":{"distanceKm":21.1,"timeSeconds":7200},"RIDE":{"ftp":220},"SWIM":{"distanceKm":2,"paceSeconds":1200},"TRIATHLON":{"format":"70.3 / half distance","timeSeconds":21600},"HYROX":{"count":6,"division":"Singles","timeSeconds":5400}}}'::jsonb;
 PERFORM public.sage_save_athlete_story(payload);
 saved:=public.sage_profile()->'profile';
 IF saved->'benchmarks'<>payload->'benchmarks' OR saved->>'age'<>'27' THEN RAISE EXCEPTION 'Story persistence failed'; END IF;
 IF saved->'avatar' IS DISTINCT FROM original->'avatar' OR saved->'profile_image_url' IS DISTINCT FROM original->'profile_image_url' OR saved->'goal_name' IS DISTINCT FROM original->'goal_name' OR saved->'onboarding_completed' IS DISTINCT FROM original->'onboarding_completed' OR saved->'date_of_birth' IS DISTINCT FROM original->'date_of_birth' THEN RAISE EXCEPTION 'Story changed unrelated profile data'; END IF;
 FOR invalid IN SELECT value FROM jsonb_array_elements('[{"age":0},{"age":121},{"age":27.5},{"age":"27"},{"gender":"invalid"},{"gender":"Self-describe","gender_description":""},{"sports":[]},{"benchmarks":[]},{"benchmarks":{"RIDE":{"ftp":601}}},{"benchmarks":{"RUN":{"distanceKm":10,"timeSeconds":0}}},{"benchmarks":{"HYROX":{"count":-1,"skipped":true}}},{"benchmarks":{"RUN":{"distanceKm":10,"timeSeconds":3600,"level":99}}}]'::jsonb) LOOP
  accepted:=false;
  BEGIN PERFORM public.sage_save_athlete_story(payload||invalid);accepted:=true;EXCEPTION WHEN raise_exception THEN NULL;END;
  IF accepted THEN RAISE EXCEPTION 'Invalid story was accepted: %',invalid;END IF;
 END LOOP;
 PERFORM public.sage_save_athlete_story(payload||'{"benchmarks":{"RUN":{"skipped":true},"HYROX":{"count":0}}}'::jsonb);
 IF public.sage_profile()->'profile'->'benchmarks'->'RUN'->>'skipped'<>'true' THEN RAISE EXCEPTION 'Skip choice was lost';END IF;
END;$$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.athlete_profiles p JOIN story_profiles_before b USING(user_id) WHERE p.user_id<>auth.uid() AND md5(to_jsonb(p)::text)<>b.digest) THEN RAISE EXCEPTION 'Another athlete was changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.entries e JOIN story_scores_before b USING(id) WHERE e.sage_score IS DISTINCT FROM b.sage_score OR e.level_at_join IS DISTINCT FROM b.level_at_join) OR EXISTS(SELECT 1 FROM public.athlete_levels l JOIN story_levels_before b USING(user_id) WHERE l.level IS DISTINCT FROM b.level) THEN RAISE EXCEPTION 'Story changed a score or assigned level'; END IF;
 IF has_function_privilege('anon','public.sage_save_athlete_story(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous save is exposed'; END IF;
END;$$;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE accepted boolean:=false;BEGIN BEGIN PERFORM public.sage_save_athlete_story('{}');accepted:=true;EXCEPTION WHEN insufficient_privilege THEN NULL;END;IF accepted THEN RAISE EXCEPTION 'Signed-out story save was accepted';END IF;END;$$;
RESET ROLE;
SELECT 'PASS: benchmark save/skip, numeric/shape validation, preserved profile data, owner isolation, unchanged scores/levels and anonymous denial' AS result;
ROLLBACK;
