-- GPS submissions use server-calculated metrics and the existing private review workflow.
ALTER TABLE public.workout_submissions DROP CONSTRAINT workout_submissions_source_check;
ALTER TABLE public.workout_submissions ADD CONSTRAINT workout_submissions_source_check CHECK(source IN ('fit','strava_link','gps'));
CREATE OR REPLACE FUNCTION sage_review_private.ingest_workout_submission(p_user_id uuid,p_source text,p_key text,p_url text,p_path text,p_name text,p_note text,p_metrics jsonb,p_streams jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE submission uuid; created boolean:=false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND role::text='athlete' AND status::text<>'suspended') THEN RAISE EXCEPTION 'Athlete account required' USING ERRCODE='42501';END IF;
 IF p_source NOT IN ('fit','strava_link','gps') OR length(p_key) NOT BETWEEN 1 AND 200 OR coalesce(length(p_note),0)>1000 OR coalesce(jsonb_typeof(p_metrics),'')<>'object' OR coalesce(jsonb_typeof(p_streams),'')<>'object' THEN RAISE EXCEPTION 'Invalid submission';END IF;
 IF p_source='fit' AND (p_path IS NULL OR split_part(p_path,'/',1)<>p_user_id::text OR p_path LIKE '%..%' OR p_key !~ '^[0-9a-f]{64}$') THEN RAISE EXCEPTION 'Invalid workout file';END IF;
 IF p_source='gps' AND (p_path IS NULL OR split_part(p_path,'/',1)<>p_user_id::text OR p_path LIKE '%..%' OR p_key !~ '^[A-Za-z0-9_-]{8,100}$') THEN RAISE EXCEPTION 'Invalid GPS recording';END IF;
 IF p_source='strava_link' AND coalesce(p_url,'') !~ '^https://(www\.strava\.com/activities/[0-9]+([/?#].*)?|strava\.com/activities/[0-9]+([/?#].*)?|strava\.app\.link/[A-Za-z0-9_-]+([/?#].*)?)$' THEN RAISE EXCEPTION 'Use a Strava activity or share link';END IF;
 IF (SELECT count(*) FROM public.workout_submissions WHERE user_id=p_user_id AND created_at>now()-interval '1 day')>=50 AND NOT EXISTS(SELECT 1 FROM public.workout_submissions WHERE user_id=p_user_id AND source=p_source AND source_key=p_key) THEN RAISE EXCEPTION 'Daily submission limit reached';END IF;
 INSERT INTO public.workout_submissions(user_id,source,source_key,source_url,file_path,file_name,note,metrics,streams) VALUES(p_user_id,p_source,p_key,p_url,p_path,left(p_name,200),nullif(trim(p_note),''),p_metrics,p_streams) ON CONFLICT(user_id,source,source_key) DO NOTHING RETURNING id INTO submission;
 created:=FOUND;
 IF NOT created THEN SELECT id INTO submission FROM public.workout_submissions WHERE user_id=p_user_id AND source=p_source AND source_key=p_key;END IF;
 RETURN jsonb_build_object('id',submission,'created',created,'status',(SELECT status FROM public.workout_submissions WHERE id=submission));
END;$$;

CREATE OR REPLACE FUNCTION sage_review_private.sage_review_submission(p_id uuid,p_status text,p_reason text,p_expected_revision integer,p_metrics jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  IF s.source IN ('fit','gps') AND p_metrics IS NOT NULL THEN RAISE EXCEPTION 'Recorded metrics come from the original workout';END IF;
  m:=CASE WHEN s.source IN ('fit','gps') THEN s.metrics ELSE coalesce(p_metrics,s.metrics) END;
  date_at:=nullif(m->>'activity_started_at','')::timestamptz;duration:=(m->>'moving_time_secs')::integer;elapsed:=coalesce((m->>'elapsed_time_secs')::integer,duration);distance:=nullif(m->>'distance_meters','')::numeric;sport:=m->>'sport_type';
  IF date_at IS NULL OR date_at>now()+interval '15 minutes' OR duration IS NULL OR duration NOT BETWEEN 1 AND 604800 OR elapsed<duration OR elapsed>604800 OR coalesce(sport,'') NOT IN ('Run','Ride','Swim','WeightTraining','CrossFit','Workout','Walk','Hike','Rowing','Yoga') OR distance<0 OR distance>10000000 OR coalesce(length(trim(m->>'activity_name')),0) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Confirm the workout name, date, sport, duration and distance before approval';END IF;
  IF workout IS NULL THEN
   source_id:=CASE WHEN s.source='gps' THEN 'gps_'||owner_id::text||'_'||s.source_key WHEN s.source='fit' THEN 'fit_'||owner_id::text||'_'||s.source_key ELSE 'shared_strava_'||owner_id::text||'_'||s.source_key END;
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

CREATE OR REPLACE FUNCTION sage_review_private.sage_workout_streams(p_activity_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.activity_logs WHERE id=p_activity_id AND (user_id=auth.uid() OR sage_review_private.workout_review_is_admin())) THEN RAISE EXCEPTION 'Workout access denied' USING ERRCODE='42501';END IF;
 RETURN (SELECT streams FROM public.workout_submissions WHERE activity_id=p_activity_id AND source IN ('fit','gps') ORDER BY created_at LIMIT 1);
END;$$;
