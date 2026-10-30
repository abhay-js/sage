BEGIN;
ALTER TABLE public.athlete_profiles ADD COLUMN age smallint CHECK(age BETWEEN 1 AND 120),
 ADD COLUMN gender_description text CHECK(length(gender_description)<=40),
 ADD COLUMN benchmarks jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(benchmarks)='object' AND octet_length(benchmarks::text)<=4096);

CREATE FUNCTION sage_review_private.sage_save_athlete_story(p_profile jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); age_value numeric; sports text[]; item jsonb; sport text; key text; number_value numeric; maximum numeric; allowed text[]; skipped boolean; metrics jsonb;
BEGIN
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=owner_id AND role::text='athlete') THEN RAISE EXCEPTION 'Athlete sign in required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid athlete profile'; END IF;
 IF jsonb_typeof(p_profile->'age') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Choose an age from 1 to 120'; END IF;
 age_value:=(p_profile->>'age')::numeric;
 IF age_value<>trunc(age_value) OR age_value NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Choose an age from 1 to 120'; END IF;
 IF coalesce(p_profile->>'gender','') NOT IN ('Woman','Man','Non-binary','Prefer not to say','Self-describe') THEN RAISE EXCEPTION 'Choose a gender option'; END IF;
 IF length(coalesce(p_profile->>'gender_description',''))>40 OR (p_profile->>'gender'='Self-describe' AND length(trim(coalesce(p_profile->>'gender_description','')))=0) THEN RAISE EXCEPTION 'Check your gender description'; END IF;
 IF jsonb_typeof(p_profile->'sports') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose your sports'; END IF;
 sports:=ARRAY(SELECT jsonb_array_elements_text(p_profile->'sports'));
 IF cardinality(sports) NOT BETWEEN 1 AND 7 OR NOT sports <@ ARRAY['RUN','RIDE','SWIM','TRIATHLON','HYROX','STRENGTH','OTHER'] OR cardinality(sports)<>(SELECT count(DISTINCT value) FROM unnest(sports) value) THEN RAISE EXCEPTION 'Choose at least one valid sport'; END IF;
 IF NOT coalesce((p_profile->>'primary_sport')=ANY(sports),false) THEN RAISE EXCEPTION 'Choose a primary sport from your selected sports'; END IF;
 metrics:=coalesce(p_profile->'benchmarks','{}');
 IF jsonb_typeof(metrics) IS DISTINCT FROM 'object' OR octet_length(metrics::text)>4096 THEN RAISE EXCEPTION 'Invalid benchmark data'; END IF;
 FOR sport,item IN SELECT * FROM jsonb_each(metrics) LOOP
  IF NOT sport=ANY(sports) OR sport NOT IN ('RUN','RIDE','SWIM','TRIATHLON','HYROX') OR jsonb_typeof(item)<>'object' THEN RAISE EXCEPTION 'Invalid benchmark sport'; END IF;
  allowed:=CASE sport WHEN 'RUN' THEN ARRAY['distanceKm','timeSeconds','skipped'] WHEN 'RIDE' THEN ARRAY['ftp','skipped'] WHEN 'SWIM' THEN ARRAY['distanceKm','paceSeconds','skipped'] WHEN 'TRIATHLON' THEN ARRAY['format','timeSeconds','skipped'] ELSE ARRAY['count','division','timeSeconds','skipped'] END;
  IF item-allowed<>'{}'::jsonb THEN RAISE EXCEPTION 'Unknown benchmark field'; END IF;
  IF item ? 'skipped' AND jsonb_typeof(item->'skipped')<>'boolean' THEN RAISE EXCEPTION 'Invalid benchmark skip choice'; END IF;
  skipped:=coalesce((item->>'skipped')::boolean,false);
  FOREACH key IN ARRAY ARRAY['distanceKm','timeSeconds','paceSeconds','ftp','count'] LOOP
   IF NOT item ? key THEN CONTINUE; END IF;
   IF jsonb_typeof(item->key) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Benchmark values must be numbers'; END IF;
   number_value:=(item->>key)::numeric;
   maximum:=CASE key WHEN 'distanceKm' THEN CASE WHEN sport='SWIM' THEN 20 ELSE 250 END WHEN 'ftp' THEN 600 WHEN 'count' THEN 999 ELSE 172800 END;
   IF number_value>maximum OR (key='count' AND number_value<0) OR (key<>'count' AND number_value<=0) OR (key<>'distanceKm' AND number_value<>trunc(number_value)) THEN RAISE EXCEPTION 'Benchmark value is outside its allowed range'; END IF;
  END LOOP;
  IF item ? 'format' AND coalesce(item->>'format','') NOT IN ('Full distance','70.3 / half distance') THEN RAISE EXCEPTION 'Choose a valid race format'; END IF;
  IF item ? 'division' AND coalesce(item->>'division','') NOT IN ('Singles','Doubles','Relay') THEN RAISE EXCEPTION 'Choose a valid HYROX division'; END IF;
  IF NOT skipped THEN
   IF (sport='RUN' AND NOT item ?& ARRAY['distanceKm','timeSeconds']) OR (sport='RIDE' AND NOT item ? 'ftp') OR (sport='SWIM' AND NOT item ?& ARRAY['distanceKm','paceSeconds']) OR (sport='TRIATHLON' AND NOT item ?& ARRAY['format','timeSeconds']) OR (sport='HYROX' AND (NOT item ? 'count' OR ((item->>'count')::numeric>0 AND NOT item ?& ARRAY['division','timeSeconds']))) THEN RAISE EXCEPTION 'Complete the benchmark or choose add later'; END IF;
  END IF;
 END LOOP;
 -- Existing RPC preserves the profile photo, goals, training history and onboarding state.
 PERFORM sage_review_private.sage_save_profile(p_profile,false);
 UPDATE public.athlete_profiles SET age=age_value::smallint,gender_description=nullif(trim(p_profile->>'gender_description'),''),benchmarks=metrics,updated_at=now() WHERE user_id=owner_id;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_save_athlete_story(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.sage_save_athlete_story(jsonb) TO authenticated,service_role;
CREATE FUNCTION public.sage_save_athlete_story(p_profile jsonb) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT sage_review_private.sage_save_athlete_story(p_profile);$$;
REVOKE ALL ON FUNCTION public.sage_save_athlete_story(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sage_save_athlete_story(jsonb) TO authenticated,service_role;
COMMIT;
