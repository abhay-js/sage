-- Pending imports count unless an administrator rejects them.
CREATE OR REPLACE FUNCTION sage_review_private.sage_recalculate(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
#variable_conflict use_variable
DECLARE e record; a record; cfg jsonb; base integer; bonus integer; mission jsonb; awards jsonb; uses jsonb; used integer; ok boolean; day_key text; daily jsonb; count_day integer; total integer; previous_total integer; sessions integer; hours numeric; running_hours numeric; streak integer; day_cursor date; mission_streak integer; last_activity uuid; streak_bonus integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 FOR e IN SELECT en.*,r.challenge_start,r.challenge_end,r.sport_types,c.config FROM public.entries en JOIN public.races r ON r.id=en.race_id JOIN public.sage_challenge_configs c ON c.race_id=r.id WHERE en.user_id=p_user_id AND en.participant_status IN ('ACTIVE','COMPLETED') ORDER BY en.id LOOP
  cfg:=e.config; total:=0; sessions:=0; hours:=0; running_hours:=0; daily:='{}'; uses:='{}'; streak:=0;last_activity:=NULL;
  DELETE FROM public.sage_challenge_activities WHERE race_id=e.race_id AND user_id=p_user_id;
  FOR a IN SELECT log.*,coalesce(w.status,'pending') review_status FROM public.activity_logs log LEFT JOIN public.workout_reviews w ON w.activity_id=log.id WHERE log.user_id=p_user_id AND log.sport_type=ANY(e.sport_types) AND coalesce(log.activity_started_at,log.activity_date)>=e.challenge_start AND coalesce(log.activity_started_at,log.activity_date)<=e.challenge_end ORDER BY coalesce(log.activity_started_at,log.activity_date),log.id LOOP
   IF a.review_status='rejected' THEN
    INSERT INTO public.sage_challenge_activities(race_id,activity_id,user_id,status) VALUES(e.race_id,a.id,p_user_id,CASE WHEN a.review_status='rejected' THEN 'REJECTED' ELSE 'PENDING' END); CONTINUE;
   END IF;
   base:=CASE WHEN cfg->>'scoringMode'='LEGACY' THEN coalesce((cfg->'legacy'->>'sessionPoints')::integer,0)+floor((running_hours+a.moving_time_secs::numeric/3600)*coalesce((cfg->'legacy'->>'hourPoints')::numeric,0))-floor(running_hours*coalesce((cfg->'legacy'->>'hourPoints')::numeric,0)) ELSE sage_review_private.sage_base_points(cfg,a.sport_type,a.distance_meters,a.moving_time_secs) END;
   IF base<=0 THEN INSERT INTO public.sage_challenge_activities(race_id,activity_id,user_id,status) VALUES(e.race_id,a.id,p_user_id,'BELOW_THRESHOLD'); CONTINUE; END IF;
   day_key:=to_char(coalesce(a.activity_started_at,a.activity_date) AT TIME ZONE coalesce(cfg->>'timezone','Asia/Kolkata'),'YYYY-MM-DD'); count_day:=coalesce((daily->>day_key)::integer,0);
   IF cfg->>'scoringMode'='LEGACY' AND coalesce(jsonb_typeof(cfg->'legacy'),'')<>'object' THEN RAISE EXCEPTION 'Legacy scoring values are required';END IF;
 IF cfg->>'maxWorkoutsPerDay' IS NOT NULL AND count_day >= (cfg->>'maxWorkoutsPerDay')::integer THEN INSERT INTO public.sage_challenge_activities(race_id,activity_id,user_id,status) VALUES(e.race_id,a.id,p_user_id,'DAILY_CAP'); CONTINUE; END IF;
   daily:=jsonb_set(daily,ARRAY[day_key],to_jsonb(count_day+1)); running_hours:=running_hours+a.moving_time_secs::numeric/3600; awards:='[]';bonus:=0;
   FOR mission IN SELECT value FROM jsonb_array_elements(coalesce(cfg->'bonuses','[]')) LOOP
    used:=coalesce((uses->>(mission->>'id'))::integer,0); IF used >= coalesce((mission->>'maxUses')::integer,1) THEN CONTINUE; END IF;
    ok:=false;
    CASE mission->>'type'
     WHEN 'EARLY_BIRD' THEN ok:=a.activity_started_at IS NOT NULL AND extract(hour FROM a.activity_started_at AT TIME ZONE coalesce(cfg->>'timezone','Asia/Kolkata'))<coalesce((mission->'metadata'->>'hour')::numeric,7);
     WHEN 'OUTDOOR' THEN ok:=a.indoor IS FALSE AND a.sport_type='Ride';
     WHEN 'ELEVATION' THEN ok:=coalesce(a.elevation_gain,0)>=coalesce((mission->'metadata'->>'elevation')::numeric,300);
     WHEN 'CUSTOM' THEN ok:=coalesce(mission->'metadata'->'activityIds','[]') ? a.id::text;
     WHEN 'STREAK' THEN
      mission_streak:=0;day_cursor:=day_key::date;
      WHILE daily ? day_cursor::text LOOP mission_streak:=mission_streak+1;day_cursor:=day_cursor-1;END LOOP;
      ok:=mission_streak>=coalesce((mission->'metadata'->>'days')::integer,3);
     WHEN 'BRICK' THEN
      ok:=a.sport_type IN ('Run','Ride','Swim') AND a.activity_started_at IS NOT NULL AND EXISTS(SELECT 1 FROM public.sage_challenge_activities ca JOIN public.activity_logs prev ON prev.id=ca.activity_id WHERE ca.race_id=e.race_id AND ca.user_id=p_user_id AND ca.status='COUNTED' AND prev.sport_type IN ('Run','Ride','Swim') AND prev.sport_type<>a.sport_type AND prev.activity_started_at IS NOT NULL AND a.activity_started_at-(prev.activity_started_at+make_interval(secs=>prev.moving_time_secs)) BETWEEN interval '0 minutes' AND make_interval(mins=>coalesce((mission->'metadata'->>'gapMinutes')::integer,60)));
     ELSE ok:=false;
    END CASE;
    IF ok THEN bonus:=bonus+(mission->>'points')::integer;awards:=awards||jsonb_build_array(jsonb_build_object('id',mission->>'id','label',mission->>'title','points',(mission->>'points')::integer));uses:=jsonb_set(uses,ARRAY[mission->>'id'],to_jsonb(used+1));END IF;
   END LOOP;
   INSERT INTO public.sage_challenge_activities(race_id,activity_id,user_id,base_points,bonus_points,total_points,status,bonuses) VALUES(e.race_id,a.id,p_user_id,base,bonus,base+bonus,'COUNTED',awards);
   total:=total+base+bonus;sessions:=sessions+1;hours:=hours+a.moving_time_secs::numeric/3600;last_activity:=a.id;
  END LOOP;
  day_cursor:=(now() AT TIME ZONE coalesce(cfg->>'timezone','Asia/Kolkata'))::date;
  FOR used IN 0..364 LOOP
   IF daily ? day_cursor::text THEN streak:=streak+1;ELSIF streak>0 THEN EXIT;END IF;day_cursor:=day_cursor-1;
  END LOOP;
  IF cfg->>'scoringMode'='LEGACY' THEN
   streak_bonus:=CASE WHEN streak>=30 THEN coalesce((cfg->'legacy'->>'streak30')::integer,0) WHEN streak>=7 THEN coalesce((cfg->'legacy'->>'streak7')::integer,0) ELSE 0 END;
   IF streak_bonus>0 AND last_activity IS NOT NULL THEN
    UPDATE public.sage_challenge_activities SET bonus_points=bonus_points+streak_bonus,total_points=total_points+streak_bonus,bonuses=bonuses||jsonb_build_array(jsonb_build_object('id','legacy-streak','label','Streak bonus','points',streak_bonus)) WHERE race_id=e.race_id AND activity_id=last_activity;
   END IF;total:=total+streak_bonus;
  END IF;
  UPDATE public.entries SET sage_score=total+coalesce(e.bonus_points,0),sessions=sessions,total_hours=hours,streak=streak,score_reached_at=CASE WHEN sage_score IS DISTINCT FROM total+coalesce(e.bonus_points,0) THEN now() ELSE score_reached_at END WHERE id=e.id;
 END LOOP;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_base_points(jsonb,text,numeric,integer),sage_review_private.sage_recalculate(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION sage_review_private.recalculate_reviewed_workouts(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN PERFORM sage_review_private.sage_recalculate(p_user_id);END;$$;

-- Flags are separate from scoring decisions; only admins can read them.
CREATE TABLE sage_review_private.automatic_workout_flags (
 activity_id uuid PRIMARY KEY REFERENCES public.activity_logs(id) ON DELETE CASCADE,
 reasons text[] NOT NULL, checked_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz, resolved_by uuid REFERENCES public.users(id)
);
ALTER TABLE sage_review_private.automatic_workout_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sage_review_private.automatic_workout_flags FROM PUBLIC, anon, authenticated;

CREATE FUNCTION sage_review_private.check_workout_anomalies() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE reasons text[] := ARRAY[]::text[]; speed numeric; median_speed numeric; samples integer; started timestamptz;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.user_id,NEW.sport_type,NEW.activity_date,NEW.activity_started_at,NEW.moving_time_secs,NEW.distance_meters) IS NOT DISTINCT FROM (OLD.user_id,OLD.sport_type,OLD.activity_date,OLD.activity_started_at,OLD.moving_time_secs,OLD.distance_meters) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM public.workout_reviews WHERE activity_id=NEW.id AND status='rejected') THEN RETURN NEW; END IF;
 started:=coalesce(NEW.activity_started_at,NEW.activity_date);
 IF started > now()+interval '15 minutes' THEN reasons:=array_append(reasons,'Workout starts in the future'); END IF;
 IF NEW.moving_time_secs<=0 OR NEW.moving_time_secs>86400 THEN reasons:=array_append(reasons,'Unusual workout duration'); END IF;
 IF NEW.distance_meters<0 THEN reasons:=array_append(reasons,'Invalid distance'); END IF;
 IF NEW.distance_meters>0 AND NEW.moving_time_secs>0 THEN
  speed:=NEW.distance_meters::numeric/NEW.moving_time_secs*3.6;
  IF (NEW.sport_type='Run' AND speed>40) OR (NEW.sport_type='Walk' AND speed>20) OR (NEW.sport_type='Hike' AND speed>25) OR (NEW.sport_type='Ride' AND speed>120) OR (NEW.sport_type='Swim' AND speed>12) THEN reasons:=array_append(reasons,'Average speed exceeds the sport check'); END IF;
  IF NEW.sport_type IN ('Run','Ride','Swim','Walk','Hike') AND NEW.distance_meters>=1000 AND NEW.moving_time_secs>=600 THEN
   SELECT count(*),percentile_cont(0.5) WITHIN GROUP (ORDER BY h.distance_meters::numeric/h.moving_time_secs*3.6) INTO samples,median_speed
   FROM (SELECT a.distance_meters,a.moving_time_secs FROM public.activity_logs a LEFT JOIN public.workout_reviews w ON w.activity_id=a.id WHERE a.user_id=NEW.user_id AND a.id<>NEW.id AND a.sport_type=NEW.sport_type AND coalesce(a.activity_started_at,a.activity_date)<started AND a.distance_meters>=1000 AND a.moving_time_secs>=600 AND coalesce(w.status,'pending')<>'rejected' ORDER BY coalesce(a.activity_started_at,a.activity_date) DESC LIMIT 30) h;
   IF samples>=5 AND speed>median_speed*3 THEN reasons:=array_append(reasons,'Average speed is more than three times the athlete’s recent median'); END IF;
  END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.activity_logs a WHERE a.user_id=NEW.user_id AND a.id<>NEW.id AND a.sport_type=NEW.sport_type AND abs(extract(epoch FROM coalesce(a.activity_started_at,a.activity_date)-started))<=60 AND abs(a.moving_time_secs-NEW.moving_time_secs)<=60) THEN reasons:=array_append(reasons,'Similar workout already exists'); END IF;
 IF cardinality(reasons)>0 THEN
  INSERT INTO sage_review_private.automatic_workout_flags(activity_id,reasons) VALUES(NEW.id,reasons)
  ON CONFLICT(activity_id) DO UPDATE SET reasons=excluded.reasons,checked_at=now(),resolved_at=NULL,resolved_by=NULL;
 ELSE
  DELETE FROM sage_review_private.automatic_workout_flags WHERE activity_id=NEW.id AND resolved_at IS NULL;
 END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.check_workout_anomalies() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sage_workout_anomalies AFTER INSERT OR UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION sage_review_private.check_workout_anomalies();

-- A rejection remains in force even if the source later updates the workout.
CREATE OR REPLACE FUNCTION sage_review_private.invalidate_changed_workout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE review public.workout_reviews;
BEGIN
 IF (NEW.user_id,NEW.sport_type,NEW.activity_date,NEW.activity_started_at,NEW.moving_time_secs,NEW.distance_meters,NEW.elevation_gain,NEW.indoor) IS DISTINCT FROM (OLD.user_id,OLD.sport_type,OLD.activity_date,OLD.activity_started_at,OLD.moving_time_secs,OLD.distance_meters,OLD.elevation_gain,OLD.indoor) THEN
  SELECT * INTO review FROM public.workout_reviews WHERE activity_id=NEW.id FOR UPDATE;
  IF FOUND AND review.status='approved' THEN
   UPDATE public.workout_reviews SET status='pending',reason='Imported workout data changed; review required',reviewed_by=NULL,reviewed_at=NULL,revision=revision+1 WHERE activity_id=NEW.id;
   INSERT INTO sage_review_private.workout_review_events(activity_id,previous_status,status,reason,reviewed_by,revision) VALUES(NEW.id,review.status,'pending','Imported workout data changed; review required',coalesce(auth.uid(),review.reviewed_by),review.revision+1);
  END IF;
  PERFORM sage_review_private.sage_recalculate(NEW.user_id);
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN PERFORM sage_review_private.sage_recalculate(OLD.user_id); END IF;
 END IF;
 RETURN NEW;
END;$$;

CREATE FUNCTION sage_review_private.resolve_automatic_workout_flag() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('approved','rejected') AND NEW.reviewed_by IS NOT NULL THEN
  UPDATE sage_review_private.automatic_workout_flags SET resolved_at=now(),resolved_by=NEW.reviewed_by WHERE activity_id=NEW.activity_id AND resolved_at IS NULL;
 END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.resolve_automatic_workout_flag() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sage_resolve_automatic_flag AFTER INSERT OR UPDATE ON public.workout_reviews FOR EACH ROW EXECUTE FUNCTION sage_review_private.resolve_automatic_workout_flag();

CREATE FUNCTION sage_review_private.admin_automatic_workout_flags(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; n integer;
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF p_offset<0 OR p_limit<1 OR p_limit>100 THEN RAISE EXCEPTION 'Invalid pagination'; END IF;
 SELECT count(*) INTO n FROM sage_review_private.automatic_workout_flags WHERE resolved_at IS NULL;
 SELECT coalesce(jsonb_agg(q.row),'[]'::jsonb) INTO result FROM (
  SELECT to_jsonb(a)||jsonb_build_object('athlete_name',u.name,'flag_reasons',f.reasons,'checked_at',f.checked_at) row
  FROM sage_review_private.automatic_workout_flags f JOIN public.activity_logs a ON a.id=f.activity_id JOIN public.users u ON u.id=a.user_id WHERE f.resolved_at IS NULL ORDER BY f.checked_at DESC,a.id LIMIT p_limit OFFSET p_offset
 ) q;
 RETURN jsonb_build_object('workouts',result,'total',n);
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_automatic_workout_flags(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_automatic_workout_flags(integer,integer) TO authenticated;
CREATE FUNCTION public.admin_automatic_workout_flags(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.admin_automatic_workout_flags(p_offset,p_limit); $$;
REVOKE ALL ON FUNCTION public.admin_automatic_workout_flags(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_automatic_workout_flags(integer,integer) TO authenticated;

-- Show imports without a manual decision as verified in the admin list.
DO $migration$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('sage_review_private.admin_workouts(uuid,text,text,integer,integer)'::regprocedure) INTO definition;
 definition:=replace(definition, $$coalesce(w.status, 'pending')$$, $$coalesce(w.status, 'approved')$$);
 definition:=replace(definition, $$coalesce(w.status,'pending')$$, $$coalesce(w.status,'approved')$$);
 EXECUTE definition;
END; $migration$;

-- Refresh existing entries to apply the counting policy immediately.
DO $$ DECLARE owner_id uuid; BEGIN FOR owner_id IN SELECT DISTINCT user_id FROM public.entries ORDER BY user_id LOOP PERFORM sage_review_private.sage_recalculate(owner_id); END LOOP; END; $$;
