BEGIN;
CREATE TABLE sage_review_private.admin_missed_activities (
 activity_id uuid PRIMARY KEY REFERENCES public.activity_logs(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES public.users(id),
 admin_id uuid NOT NULL REFERENCES public.users(id),
 request_id uuid NOT NULL UNIQUE,
 reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 1000),
 evidence_url text NOT NULL CHECK (length(evidence_url) BETWEEN 9 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,evidence_url)
);
ALTER TABLE sage_review_private.admin_missed_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sage_review_private.admin_missed_activities FROM PUBLIC,anon,authenticated;

CREATE FUNCTION sage_review_private.admin_add_missed_activity(p_user_id uuid,p_details jsonb,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE started timestamptz; duration integer; distance numeric; sport text; title text; reason text; evidence text; activity uuid; previous record;
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF p_user_id IS NULL OR p_request_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND role::text='athlete') THEN RAISE EXCEPTION 'Choose an athlete and a request ID'; END IF;
 SELECT * INTO previous FROM sage_review_private.admin_missed_activities WHERE request_id=p_request_id;
 IF FOUND THEN IF previous.user_id<>p_user_id OR previous.admin_id<>auth.uid() THEN RAISE EXCEPTION 'Request ID already used'; END IF; RETURN jsonb_build_object('activity_id',previous.activity_id,'created',false); END IF;
 sport:=p_details->>'sport_type'; title:=trim(p_details->>'activity_name'); reason:=trim(p_details->>'reason'); evidence:=trim(p_details->>'evidence_url');
 BEGIN started:=(p_details->>'activity_started_at')::timestamptz; duration:=(p_details->>'moving_time_secs')::integer; distance:=nullif(p_details->>'distance_meters','')::numeric; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Enter a valid date, duration and distance'; END;
 IF sport IS NULL OR sport NOT IN ('Run','Ride','Swim','WeightTraining','CrossFit','Workout','Walk','Hike','Rowing','Yoga') OR coalesce(length(title),0) NOT BETWEEN 2 AND 200 OR started IS NULL OR started>now()+interval '15 minutes' OR duration IS NULL OR duration NOT BETWEEN 1 AND 604800 OR distance<0 OR distance>10000000 OR coalesce(length(reason),0) NOT BETWEEN 3 AND 1000 OR coalesce(length(evidence),0) NOT BETWEEN 9 AND 2000 OR evidence !~* '^https://[^[:space:]/]+(/[^[:space:]]*)?$' THEN RAISE EXCEPTION 'Enter a valid workout, reason and HTTPS evidence link'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 IF EXISTS(SELECT 1 FROM sage_review_private.admin_missed_activities WHERE user_id=p_user_id AND evidence_url=evidence) THEN RAISE EXCEPTION 'This evidence link has already been used for this athlete'; END IF;
 IF EXISTS(SELECT 1 FROM public.activity_logs WHERE user_id=p_user_id AND sport_type=sport AND abs(extract(epoch FROM coalesce(activity_started_at,activity_date)-started))<=60 AND abs(moving_time_secs-duration)<=60) THEN RAISE EXCEPTION 'A similar workout already exists. Review it instead to avoid double counting.'; END IF;
 INSERT INTO public.activity_logs(user_id,strava_activity_id,sport_type,activity_name,activity_date,activity_started_at,moving_time_secs,elapsed_time_secs,distance_meters)
 VALUES(p_user_id,'admin_'||p_request_id::text,sport,title,started,started,duration,duration,distance) RETURNING id INTO activity;
 INSERT INTO sage_review_private.admin_missed_activities(activity_id,user_id,admin_id,request_id,reason,evidence_url) VALUES(activity,p_user_id,auth.uid(),p_request_id,reason,evidence);
 PERFORM sage_review_private.review_workout(activity,'approved',NULL,0);
 RETURN jsonb_build_object('activity_id',activity,'created',true);
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_add_missed_activity(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_add_missed_activity(uuid,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.admin_add_missed_activity(p_user_id uuid,p_details jsonb,p_request_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.admin_add_missed_activity(p_user_id,p_details,p_request_id); $$;
REVOKE ALL ON FUNCTION public.admin_add_missed_activity(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_add_missed_activity(uuid,jsonb,uuid) TO authenticated;

CREATE FUNCTION sage_review_private.admin_missed_activity_history(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('activity_id',m.activity_id,'admin_name',u.name,'reason',m.reason,'evidence_url',m.evidence_url,'created_at',m.created_at,'activity_name',a.activity_name) ORDER BY m.created_at DESC),'[]'::jsonb) FROM sage_review_private.admin_missed_activities m JOIN public.users u ON u.id=m.admin_id JOIN public.activity_logs a ON a.id=m.activity_id WHERE m.user_id=p_user_id);
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_missed_activity_history(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_missed_activity_history(uuid) TO authenticated;
CREATE FUNCTION public.admin_missed_activity_history(p_user_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.admin_missed_activity_history(p_user_id); $$;
REVOKE ALL ON FUNCTION public.admin_missed_activity_history(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_missed_activity_history(uuid) TO authenticated;
COMMIT;
