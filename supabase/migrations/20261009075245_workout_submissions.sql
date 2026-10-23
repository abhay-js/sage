CREATE TABLE public.workout_submissions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id),
 source text NOT NULL CHECK(source IN ('fit','strava_link')),source_key text NOT NULL,
 source_url text,file_path text,file_name text,note text,metrics jsonb NOT NULL DEFAULT '{}',streams jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),reason text,
 activity_id uuid REFERENCES public.activity_logs(id),revision integer NOT NULL DEFAULT 1,
 reviewed_by uuid,reviewed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,source,source_key));
CREATE INDEX sage_submission_queue ON public.workout_submissions(status,created_at DESC);
ALTER TABLE public.workout_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_submissions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.workout_submissions TO authenticated;
GRANT ALL ON public.workout_submissions TO service_role;
CREATE POLICY sage_submission_read ON public.workout_submissions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE TABLE sage_review_private.submission_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),submission_id uuid NOT NULL REFERENCES public.workout_submissions(id),status text NOT NULL,reason text,reviewed_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE sage_review_private.submission_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sage_review_private.submission_events FROM PUBLIC,anon,authenticated;

-- Only the authenticated Edge ingestion service can create a verified parser result.
CREATE FUNCTION sage_review_private.ingest_workout_submission(p_user_id uuid,p_source text,p_key text,p_url text,p_path text,p_name text,p_note text,p_metrics jsonb,p_streams jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE submission uuid; created boolean:=false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND role::text='athlete' AND status::text<>'suspended') THEN RAISE EXCEPTION 'Athlete account required' USING ERRCODE='42501';END IF;
 IF p_source NOT IN ('fit','strava_link') OR length(p_key) NOT BETWEEN 1 AND 200 OR coalesce(length(p_note),0)>1000 OR coalesce(jsonb_typeof(p_metrics),'')<>'object' OR coalesce(jsonb_typeof(p_streams),'')<>'object' THEN RAISE EXCEPTION 'Invalid submission';END IF;
 IF p_source='fit' AND (p_path IS NULL OR split_part(p_path,'/',1)<>p_user_id::text OR p_path LIKE '%..%' OR p_key !~ '^[0-9a-f]{64}$') THEN RAISE EXCEPTION 'Invalid workout file';END IF;
 IF p_source='strava_link' AND coalesce(p_url,'') !~ '^https://(www\.strava\.com/activities/[0-9]+([/?#].*)?|strava\.com/activities/[0-9]+([/?#].*)?|strava\.app\.link/[A-Za-z0-9_-]+([/?#].*)?)$' THEN RAISE EXCEPTION 'Use a Strava activity or share link';END IF;
 IF (SELECT count(*) FROM public.workout_submissions WHERE user_id=p_user_id AND created_at>now()-interval '1 day')>=50 AND NOT EXISTS(SELECT 1 FROM public.workout_submissions WHERE user_id=p_user_id AND source=p_source AND source_key=p_key) THEN RAISE EXCEPTION 'Daily submission limit reached';END IF;
 INSERT INTO public.workout_submissions(user_id,source,source_key,source_url,file_path,file_name,note,metrics,streams) VALUES(p_user_id,p_source,p_key,p_url,p_path,left(p_name,200),nullif(trim(p_note),''),p_metrics,p_streams) ON CONFLICT(user_id,source,source_key) DO NOTHING RETURNING id INTO submission;
 created:=FOUND;
 IF NOT created THEN SELECT id INTO submission FROM public.workout_submissions WHERE user_id=p_user_id AND source=p_source AND source_key=p_key;END IF;
 RETURN jsonb_build_object('id',submission,'created',created,'status',(SELECT status FROM public.workout_submissions WHERE id=submission));
END;$$;
CREATE FUNCTION public.ingest_workout_submission(p_user_id uuid,p_source text,p_key text,p_url text,p_path text,p_name text,p_note text,p_metrics jsonb,p_streams jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.ingest_workout_submission(p_user_id,p_source,p_key,p_url,p_path,p_name,p_note,p_metrics,p_streams);$$;
REVOKE ALL ON FUNCTION sage_review_private.ingest_workout_submission(uuid,text,text,text,text,text,text,jsonb,jsonb),public.ingest_workout_submission(uuid,text,text,text,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION sage_review_private.ingest_workout_submission(uuid,text,text,text,text,text,text,jsonb,jsonb),public.ingest_workout_submission(uuid,text,text,text,text,text,text,jsonb,jsonb) TO service_role;

CREATE FUNCTION sage_review_private.sage_submissions(p_admin boolean DEFAULT false,p_status text DEFAULT 'all',p_offset integer DEFAULT 0,p_limit integer DEFAULT 50) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR (p_admin AND NOT sage_review_private.workout_review_is_admin()) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';END IF;
 IF p_status NOT IN ('all','pending','approved','rejected') OR p_offset<0 OR p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid filters';END IF;
 RETURN jsonb_build_object('total',(SELECT count(*) FROM public.workout_submissions WHERE (p_admin OR user_id=auth.uid()) AND (p_status='all' OR status=p_status)),
 'submissions',(SELECT coalesce(jsonb_agg(row ORDER BY row->>'created_at' DESC),'[]') FROM (SELECT to_jsonb(s)-'streams'||jsonb_build_object('athlete_name',u.name) row FROM public.workout_submissions s JOIN public.users u ON u.id=s.user_id WHERE (p_admin OR s.user_id=auth.uid()) AND (p_status='all' OR s.status=p_status) ORDER BY s.created_at DESC,s.id LIMIT p_limit OFFSET p_offset) q));
END;$$;
CREATE FUNCTION sage_review_private.sage_submission_detail(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501';END IF;
 SELECT to_jsonb(s)||jsonb_build_object('athlete_name',u.name,'history',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY created_at DESC),'[]') FROM sage_review_private.submission_events e WHERE e.submission_id=s.id)) INTO result FROM public.workout_submissions s JOIN public.users u ON u.id=s.user_id WHERE s.id=p_id AND (s.user_id=auth.uid() OR sage_review_private.workout_review_is_admin());
 IF result IS NULL THEN RAISE EXCEPTION 'Submission not found' USING ERRCODE='42501';END IF;RETURN result;
END;$$;
CREATE FUNCTION sage_review_private.sage_workout_streams(p_activity_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.activity_logs WHERE id=p_activity_id AND (user_id=auth.uid() OR sage_review_private.workout_review_is_admin())) THEN RAISE EXCEPTION 'Workout access denied' USING ERRCODE='42501';END IF;
 RETURN (SELECT streams FROM public.workout_submissions WHERE activity_id=p_activity_id AND source='fit' ORDER BY created_at LIMIT 1);
END;$$;

CREATE FUNCTION sage_review_private.sage_review_submission(p_id uuid,p_status text,p_reason text,p_expected_revision integer,p_metrics jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.workout_submissions; owner_id uuid; m jsonb; workout uuid; date_at timestamptz; duration integer; elapsed integer; distance numeric; sport text; review_revision integer; source_id text;
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';END IF;
 IF p_status NOT IN ('approved','rejected') OR (p_status='rejected' AND coalesce(length(trim(p_reason)),0)<3) OR coalesce(length(p_reason),0)>1000 THEN RAISE EXCEPTION 'Choose a decision and provide a rejection reason';END IF;
 SELECT user_id INTO owner_id FROM public.workout_submissions WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
 SELECT * INTO s FROM public.workout_submissions WHERE id=p_id FOR UPDATE;
 IF p_expected_revision IS NULL OR s.revision<>p_expected_revision THEN RAISE EXCEPTION 'Submission changed; refresh before reviewing' USING ERRCODE='40001';END IF;
 workout:=s.activity_id;
 IF workout IS NOT NULL AND p_metrics IS NOT NULL THEN RAISE EXCEPTION 'Review the existing workout to change its details';END IF;
 PERFORM set_config('sage.reviewing_submission',p_id::text,true);
 IF p_status='approved' THEN
  IF s.source='fit' AND p_metrics IS NOT NULL THEN RAISE EXCEPTION 'FIT metrics come from the recorded file';END IF;
  m:=CASE WHEN s.source='fit' THEN s.metrics ELSE coalesce(p_metrics,s.metrics) END;
  date_at:=nullif(m->>'activity_started_at','')::timestamptz;duration:=(m->>'moving_time_secs')::integer;elapsed:=coalesce((m->>'elapsed_time_secs')::integer,duration);distance:=nullif(m->>'distance_meters','')::numeric;sport:=m->>'sport_type';
  IF date_at IS NULL OR date_at>now()+interval '15 minutes' OR duration IS NULL OR duration NOT BETWEEN 1 AND 604800 OR elapsed<duration OR elapsed>604800 OR coalesce(sport,'') NOT IN ('Run','Ride','Swim','WeightTraining','CrossFit','Workout','Walk','Hike','Rowing','Yoga') OR distance<0 OR distance>10000000 OR coalesce(length(trim(m->>'activity_name')),0) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Confirm the workout name, date, sport, duration and distance before approval';END IF;
  IF workout IS NULL THEN
   source_id:=CASE WHEN s.source='fit' THEN 'fit_'||owner_id::text||'_'||s.source_key ELSE 'shared_strava_'||owner_id::text||'_'||s.source_key END;
   IF EXISTS(SELECT 1 FROM public.activity_logs WHERE user_id=owner_id AND sport_type=sport AND abs(extract(epoch FROM coalesce(activity_started_at,activity_date)-date_at))<=60 AND abs(moving_time_secs-duration)<=60) THEN RAISE EXCEPTION 'A similar workout is already imported. Review that workout instead to avoid double counting.';END IF;
   INSERT INTO public.activity_logs(user_id,strava_activity_id,sport_type,activity_name,activity_date,activity_started_at,moving_time_secs,elapsed_time_secs,distance_meters,calories,elevation_gain,avg_heartrate,max_heartrate,avg_speed,avg_power,indoor)
   VALUES(owner_id,source_id,sport,trim(m->>'activity_name'),date_at,date_at,duration,elapsed,distance,nullif(m->>'calories','')::numeric,nullif(m->>'elevation_gain','')::numeric,nullif(m->>'avg_heartrate','')::numeric,nullif(m->>'max_heartrate','')::numeric,nullif(m->>'avg_speed','')::numeric,nullif(m->>'avg_power','')::numeric,(m->>'indoor')::boolean) RETURNING id INTO workout;
  END IF;
  UPDATE public.activity_logs SET activity_name=trim(m->>'activity_name'),sport_type=sport,activity_started_at=date_at,activity_date=date_at,moving_time_secs=duration,elapsed_time_secs=elapsed,distance_meters=distance,calories=nullif(m->>'calories','')::numeric,elevation_gain=nullif(m->>'elevation_gain','')::numeric,avg_heartrate=nullif(m->>'avg_heartrate','')::numeric,max_heartrate=nullif(m->>'max_heartrate','')::numeric,avg_speed=nullif(m->>'avg_speed','')::numeric,avg_power=nullif(m->>'avg_power','')::numeric,indoor=(m->>'indoor')::boolean WHERE id=workout;
  SELECT coalesce((SELECT revision FROM public.workout_reviews WHERE activity_id=workout),0) INTO review_revision;
  PERFORM sage_review_private.review_workout(workout,'approved',NULL,review_revision);
 ELSE
  IF workout IS NOT NULL THEN
   SELECT coalesce((SELECT revision FROM public.workout_reviews WHERE activity_id=workout),0) INTO review_revision;
   PERFORM sage_review_private.review_workout(workout,'rejected',trim(p_reason),review_revision);
  END IF;
 END IF;
 UPDATE public.workout_submissions SET status=p_status,reason=CASE WHEN p_status='rejected' THEN trim(p_reason) ELSE NULL END,activity_id=workout,metrics=CASE WHEN p_status='approved' AND s.source='strava_link' THEN m ELSE metrics END,revision=revision+1,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p_id;
 INSERT INTO sage_review_private.submission_events(submission_id,status,reason,reviewed_by) VALUES(p_id,p_status,CASE WHEN p_status='rejected' THEN trim(p_reason) ELSE NULL END,auth.uid());
 PERFORM set_config('sage.reviewing_submission','',true);
 RETURN jsonb_build_object('id',p_id,'activity_id',workout,'status',p_status,'revision',s.revision+1);
END;$$;
DO $$ DECLARE f record; args text; BEGIN
 FOR f IN SELECT p.oid,p.proname,pg_get_function_arguments(p.oid) declarations,pg_get_function_identity_arguments(p.oid) identity,pg_get_function_result(p.oid) result FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='sage_review_private' AND p.proname IN ('sage_submissions','sage_submission_detail','sage_review_submission','sage_workout_streams') LOOP
  SELECT coalesce(string_agg('$'||i::text,','),'') INTO args FROM generate_series(1,(SELECT pronargs FROM pg_catalog.pg_proc WHERE oid=f.oid)) i;
  EXECUTE format('REVOKE ALL ON FUNCTION sage_review_private.%I(%s) FROM PUBLIC,anon',f.proname,f.identity);
  EXECUTE format('GRANT EXECUTE ON FUNCTION sage_review_private.%I(%s) TO authenticated',f.proname,f.identity);
  EXECUTE format('CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql SECURITY INVOKER SET search_path='''' AS %L',f.proname,f.declarations,f.result,'SELECT sage_review_private.'||f.proname||'('||args||');');
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon',f.proname,f.identity);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',f.proname,f.identity);
 END LOOP;
END;$$;
DO $storage$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit) VALUES('workout-files','workout-files',false,10485760) ON CONFLICT(id) DO NOTHING;
  EXECUTE $policy$CREATE POLICY sage_workout_file_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='workout-files' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)$policy$;
  EXECUTE $policy$CREATE POLICY sage_workout_file_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='workout-files' AND ((storage.foldername(name))[1]=(SELECT auth.uid())::text OR (SELECT sage_review_private.workout_review_is_admin())))$policy$;
 END IF;
END;$storage$;

CREATE FUNCTION sage_review_private.sync_submission_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.workout_submissions SET status=NEW.status,reason=NEW.reason,revision=revision+1,reviewed_by=NEW.reviewed_by,reviewed_at=NEW.reviewed_at WHERE activity_id=NEW.activity_id AND id::text<>coalesce(current_setting('sage.reviewing_submission',true),'');
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sync_submission_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sage_submission_review_sync AFTER INSERT OR UPDATE ON public.workout_reviews FOR EACH ROW EXECUTE FUNCTION sage_review_private.sync_submission_review();
