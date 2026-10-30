BEGIN;
ALTER TABLE public.athlete_profiles ADD COLUMN dawn_answers jsonb CHECK(dawn_answers IS NULL OR (jsonb_typeof(dawn_answers)='object' AND octet_length(dawn_answers::text)<=16384));
CREATE FUNCTION sage_review_private.sage_save_dawn_profile(p_profile jsonb,p_answers jsonb,p_complete boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); field text; val jsonb; key text; n numeric; selected text[]; picked text; pb_key text;
 allowed_pb text[]:=ARRAY['5k','10k','half','marathon','ultra','hy_pro','hy_open','hy_doubles','hy_relay','sprint','olympic','half70','full'];
BEGIN
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=owner_id AND role::text='athlete') THEN RAISE EXCEPTION 'Athlete sign in required' USING ERRCODE='42501'; END IF;
 IF p_complete IS NULL OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object' OR octet_length(p_answers::text)>16384 OR p_answers-'version'-'runLongest'-'hyCount'-'hyDivs'-'triDone'-'swimLongest'-'swimK'-'ftpKnown'-'ftp'-'rideLongest'-'days'-'src'-'pb'-'skip'-'skippedSports'<>'{}'::jsonb OR p_answers->'version' IS DISTINCT FROM '2'::jsonb OR NOT p_answers ?& ARRAY['version','hyDivs','triDone','ftp','days','src','pb','skip','skippedSports'] THEN RAISE EXCEPTION 'Invalid athlete story'; END IF;
 FOREACH field IN ARRAY ARRAY['hyDivs','triDone','skippedSports'] LOOP
  val:=p_answers->field;
  IF jsonb_typeof(val) IS DISTINCT FROM 'array' OR jsonb_array_length(val)>7 OR EXISTS(SELECT 1 FROM jsonb_array_elements(val) v WHERE jsonb_typeof(v)<>'string') OR (SELECT count(*) FROM jsonb_array_elements(val))<>(SELECT count(DISTINCT v) FROM jsonb_array_elements(val) v) THEN RAISE EXCEPTION 'Invalid story selections'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(val) v WHERE NOT v=ANY(CASE field WHEN 'hyDivs' THEN ARRAY['open','pro','doubles','relay'] WHEN 'triDone' THEN ARRAY['sprint','olympic','half70','full'] ELSE ARRAY['run','hyrox','tri','swim','ride','lift','other'] END)) THEN RAISE EXCEPTION 'Unknown story selection'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['ftp','days','hyCount'] LOOP
  val:=p_answers->field;
  IF field='hyCount' AND (val IS NULL OR val='null'::jsonb) THEN CONTINUE; END IF;
  IF jsonb_typeof(val) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Story values must be numbers'; END IF;
  n:=(p_answers->>field)::numeric;
  IF n<>trunc(n) OR n<(CASE WHEN field='hyCount' THEN 0 ELSE 1 END) OR n>(CASE field WHEN 'ftp' THEN 600 WHEN 'days' THEN 7 ELSE 999 END) THEN RAISE EXCEPTION 'Story value is outside its allowed range'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['runLongest','swimLongest','swimK','ftpKnown','rideLongest','src'] LOOP
  val:=p_answers->field;
  IF field<>'src' AND (val IS NULL OR val='null'::jsonb) THEN CONTINUE; END IF;
  IF jsonb_typeof(val) IS DISTINCT FROM 'string' OR NOT (p_answers->>field)=ANY(CASE field WHEN 'runLongest' THEN ARRAY['none','5k','10k','half','marathon','ultra'] WHEN 'swimLongest' THEN ARRAY['500','1k','2k','4k'] WHEN 'swimK' THEN ARRAY['<15','15-20','20-25','25-30','30+'] WHEN 'ftpKnown' THEN ARRAY['yes','no'] WHEN 'rideLongest' THEN ARRAY['20','50','100','160'] ELSE ARRAY['apple','garmin','coros','whoop','fitbit','phone'] END) THEN RAISE EXCEPTION 'Invalid story choice'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['pb','skip'] LOOP
  IF jsonb_typeof(p_answers->field) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid finish times'; END IF;
  FOR key,val IN SELECT * FROM jsonb_each(p_answers->field) LOOP
   IF NOT key=ANY(allowed_pb) THEN RAISE EXCEPTION 'Unknown finish time'; END IF;
   IF field='skip' THEN IF jsonb_typeof(val) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid time skip choice'; END IF;
   ELSE IF jsonb_typeof(val) IS DISTINCT FROM 'number' OR (val::text)::numeric<=0 OR (val::text)::numeric>2880 THEN RAISE EXCEPTION 'Finish time is outside its allowed range'; END IF; END IF;
  END LOOP;
 END LOOP;
 -- The existing owner-scoped validator handles age, gender, name, sports and legacy benchmark shapes.
 PERFORM sage_review_private.sage_save_athlete_story(p_profile);
 selected:=ARRAY(SELECT jsonb_array_elements_text(p_profile->'sports'));
 FOREACH field IN ARRAY ARRAY['run','hyrox','tri','swim','ride'] LOOP
  IF (p_answers->'skippedSports') ? field THEN CONTINUE; END IF;
  IF NOT (CASE field WHEN 'run' THEN 'RUN' WHEN 'hyrox' THEN 'HYROX' WHEN 'tri' THEN 'TRIATHLON' WHEN 'swim' THEN 'SWIM' ELSE 'RIDE' END)=ANY(selected) THEN CONTINUE; END IF;
  pb_key:=NULL;
  IF field='run' THEN
   IF coalesce(p_answers->>'runLongest','')='' THEN RAISE EXCEPTION 'Choose your longest race'; END IF;
   IF p_answers->>'runLongest'<>'none' THEN pb_key:=p_answers->>'runLongest'; END IF;
  ELSIF field='hyrox' THEN
   IF p_answers->>'hyCount' IS NULL THEN RAISE EXCEPTION 'Choose your HYROX race count'; END IF;
   IF (p_answers->>'hyCount')::integer>0 THEN
    SELECT v INTO picked FROM unnest(ARRAY['pro','open','doubles','relay']) WITH ORDINALITY t(v,i) WHERE (p_answers->'hyDivs') ? v ORDER BY i LIMIT 1;
    IF picked IS NULL THEN RAISE EXCEPTION 'Choose your HYROX divisions'; END IF;pb_key:='hy_'||picked;
   END IF;
  ELSIF field='tri' THEN
   SELECT v INTO picked FROM unnest(ARRAY['full','half70','olympic','sprint']) WITH ORDINALITY t(v,i) WHERE (p_answers->'triDone') ? v ORDER BY i LIMIT 1;
   IF picked IS NULL THEN RAISE EXCEPTION 'Choose your triathlon distances'; END IF;pb_key:=picked;
  ELSIF field='swim' AND (p_answers->>'swimLongest' IS NULL OR p_answers->>'swimK' IS NULL) THEN RAISE EXCEPTION 'Choose your swim distance and pace range';
  ELSIF field='ride' AND (p_answers->>'ftpKnown' IS NULL OR (p_answers->>'ftpKnown'='no' AND p_answers->>'rideLongest' IS NULL)) THEN RAISE EXCEPTION 'Choose your FTP or longest ride'; END IF;
  IF pb_key IS NOT NULL AND NOT coalesce((p_answers->'skip'->>pb_key)::boolean,false) AND NOT (p_answers->'pb') ? pb_key THEN RAISE EXCEPTION 'Add a finish time or choose Not sure'; END IF;
 END LOOP;
 UPDATE public.athlete_profiles SET dawn_answers=p_answers,onboarding_completed=onboarding_completed OR p_complete,updated_at=now() WHERE user_id=owner_id;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_save_dawn_profile(jsonb,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.sage_save_dawn_profile(jsonb,jsonb,boolean) TO authenticated,service_role;
CREATE FUNCTION public.sage_save_dawn_profile(p_profile jsonb,p_answers jsonb,p_complete boolean DEFAULT false) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT sage_review_private.sage_save_dawn_profile(p_profile,p_answers,p_complete);$$;
REVOKE ALL ON FUNCTION public.sage_save_dawn_profile(jsonb,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sage_save_dawn_profile(jsonb,jsonb,boolean) TO authenticated,service_role;
COMMIT;
