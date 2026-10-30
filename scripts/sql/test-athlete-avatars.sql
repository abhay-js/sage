-- Run inside a transaction after the avatar migration. This test always rolls back.
-- Uses the existing disposable development athlete; never changes a real account permanently.
CREATE TEMP TABLE avatar_profiles_before AS SELECT user_id,full_name,avatar FROM public.athlete_profiles;
CREATE TEMP TABLE avatar_entries_before AS SELECT id,sage_score,level_at_join FROM public.entries;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.users WHERE email='dev.user1@sage.test'),true);
SET LOCAL ROLE authenticated;
SELECT public.sage_save_avatar('Avatar Test Athlete','{"skin":"deep","kit":"lilac","gear":"Band","movement":"Ride"}'::jsonb);
DO $$ DECLARE profile jsonb; item jsonb; accepted boolean; BEGIN
 profile := public.sage_profile()->'profile';
 IF profile->>'full_name' <> 'Avatar Test Athlete' OR profile->'avatar' <> '{"skin":"deep","kit":"lilac","gear":"Band","movement":"Ride"}'::jsonb THEN RAISE EXCEPTION 'Avatar persistence failed'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements('[null,[],{}, {"skin":null,"kit":"orange","gear":"Cap","movement":"Run"}, {"skin":"warm","kit":"invalid","gear":"Cap","movement":"Run"}, {"skin":"warm","kit":"orange","gear":"Cap","movement":"Run","level":99}]'::jsonb) LOOP
   accepted := false;
   BEGIN PERFORM public.sage_save_avatar('Invalid Avatar',item); accepted := true; EXCEPTION WHEN raise_exception THEN NULL; END;
   IF accepted THEN RAISE EXCEPTION 'Invalid avatar was accepted: %',item; END IF;
 END LOOP;
 accepted := false;
 BEGIN PERFORM public.sage_save_avatar('X',profile->'avatar'); accepted := true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF accepted THEN RAISE EXCEPTION 'Invalid name was accepted'; END IF;
END;$$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.athlete_profiles p JOIN avatar_profiles_before b USING(user_id) WHERE p.user_id<>auth.uid() AND (p.full_name IS DISTINCT FROM b.full_name OR p.avatar IS DISTINCT FROM b.avatar)) THEN RAISE EXCEPTION 'Another athlete was changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.entries e JOIN avatar_entries_before b USING(id) WHERE e.sage_score IS DISTINCT FROM b.sage_score OR e.level_at_join IS DISTINCT FROM b.level_at_join) THEN RAISE EXCEPTION 'Avatar changed challenge points or levels'; END IF;
 IF has_function_privilege('anon','public.sage_save_avatar(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous avatar write is exposed'; END IF;
END;$$;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE accepted boolean := false; BEGIN
 BEGIN PERFORM public.sage_save_avatar('Unsigned Athlete','{"skin":"warm","kit":"orange","gear":"Cap","movement":"Run"}'::jsonb); accepted := true; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF accepted THEN RAISE EXCEPTION 'Unsigned avatar write was accepted'; END IF;
END;$$;
RESET ROLE;
SELECT 'PASS: avatar persistence, input validation, owner isolation, unchanged scoring/levels, and anonymous denial' AS result;
ROLLBACK;
