GRANT USAGE ON SCHEMA sage_review_private TO service_role;
-- Typed profile data stays separate from public identity and trusted level data.
CREATE TABLE public.athlete_profiles(user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 full_name text NOT NULL, profile_image_url text, gender text, date_of_birth date, city text, country text,
 sports text[] NOT NULL DEFAULT '{}',primary_sport text,events text[] NOT NULL DEFAULT '{}',goal_name text,goal_date date,goal_target text,
 weekly_sessions text,weekly_hours text,running_volume text,cycling_volume text,swimming_volume text,strength_sessions text,
 onboarding_completed boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.athlete_profiles(user_id,full_name,onboarding_completed) SELECT id,name,true FROM public.users WHERE role::text='athlete';
CREATE TABLE public.sage_level_definitions(id smallint PRIMARY KEY,name text NOT NULL,description text NOT NULL);
INSERT INTO public.sage_level_definitions VALUES(1,'Level 1','Experienced athletes'),(2,'Level 2','Developing athletes');
CREATE TABLE sage_review_private.level_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id),previous_level smallint,new_level smallint,reason text,updated_by uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE sage_review_private.level_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sage_review_private.level_history FROM PUBLIC,anon,authenticated;
CREATE FUNCTION sage_review_private.record_level_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.level IS DISTINCT FROM OLD.level THEN
 INSERT INTO sage_review_private.level_history(user_id,previous_level,new_level,reason,updated_by) VALUES(NEW.user_id,CASE WHEN TG_OP='UPDATE' THEN OLD.level ELSE NULL END,NEW.level,nullif(current_setting('sage.level_reason',true),''),NEW.updated_by);
 END IF; RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.record_level_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sage_level_history AFTER INSERT OR UPDATE ON public.athlete_levels FOR EACH ROW EXECUTE FUNCTION sage_review_private.record_level_history();
ALTER TABLE public.entries ADD COLUMN level_at_join smallint,ADD COLUMN participant_status text NOT NULL DEFAULT 'ACTIVE' CHECK(participant_status IN ('ACTIVE','COMPLETED','DISQUALIFIED','WITHDRAWN')),ADD COLUMN score_reached_at timestamptz NOT NULL DEFAULT now();
UPDATE public.entries e SET level_at_join=l.level FROM public.athlete_levels l WHERE l.user_id=e.user_id;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS activity_started_at timestamptz;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS indoor boolean;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS avg_power numeric;
CREATE TABLE public.sage_challenge_configs(race_id uuid PRIMARY KEY REFERENCES public.races(id) ON DELETE CASCADE,config jsonb NOT NULL,revision integer NOT NULL DEFAULT 1,updated_by uuid,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.sage_challenge_configs(race_id,config) SELECT id,
 '{"description":"","challengeType":"Training challenge","timezone":"Asia/Kolkata","maxWorkoutsPerDay":null,"scoringMode":"LEGACY","legacy":{"sessionPoints":10,"hourPoints":15,"streak7":50,"streak30":200},"scoringRules":[],"bonuses":[],"rules":[],"rewards":[]}'::jsonb FROM public.races;
CREATE TABLE public.sage_challenge_activities(race_id uuid NOT NULL REFERENCES public.races(id),activity_id uuid NOT NULL REFERENCES public.activity_logs(id),user_id uuid NOT NULL REFERENCES public.users(id),base_points integer NOT NULL DEFAULT 0,bonus_points integer NOT NULL DEFAULT 0,total_points integer NOT NULL DEFAULT 0,status text NOT NULL,bonuses jsonb NOT NULL DEFAULT '[]',updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(race_id,activity_id));
CREATE INDEX sage_challenge_activity_owner ON public.sage_challenge_activities(user_id,activity_id);
CREATE INDEX sage_board_order ON public.entries(race_id,sage_score DESC,score_reached_at,created_at,id);
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sage_level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sage_challenge_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sage_challenge_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.athlete_profiles,public.sage_level_definitions,public.sage_challenge_configs,public.sage_challenge_activities FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.athlete_profiles,public.sage_level_definitions,public.sage_challenge_configs,public.sage_challenge_activities TO authenticated;
GRANT ALL ON public.athlete_profiles,public.sage_level_definitions,public.sage_challenge_configs,public.sage_challenge_activities TO service_role;
CREATE POLICY sage_profile_read ON public.athlete_profiles FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE POLICY sage_levels_read ON public.sage_level_definitions FOR SELECT TO authenticated USING(true);
CREATE POLICY sage_config_read ON public.sage_challenge_configs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.races r WHERE r.id=race_id AND (r.status::text<>'draft' OR (SELECT sage_review_private.workout_review_is_admin()))));
CREATE POLICY sage_activity_read ON public.sage_challenge_activities FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
REVOKE INSERT,UPDATE,DELETE ON public.entries FROM authenticated,anon;

CREATE FUNCTION sage_review_private.sage_profile() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('profile',(SELECT to_jsonb(p) FROM public.athlete_profiles p WHERE user_id=auth.uid()),'level',(SELECT level FROM public.athlete_levels WHERE user_id=auth.uid()),'levels',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM public.sage_level_definitions l));
END;$$;
CREATE FUNCTION sage_review_private.sage_save_profile(p_profile jsonb,p_complete boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sports text[]; primary_sport text; full_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND role::text='athlete') THEN RAISE EXCEPTION 'Athlete sign in required' USING ERRCODE='42501'; END IF;
 full_name:=trim(p_profile->>'full_name'); sports:=ARRAY(SELECT jsonb_array_elements_text(p_profile->'sports')); primary_sport:=p_profile->>'primary_sport';
 IF coalesce(length(full_name),0) NOT BETWEEN 2 AND 120 OR NOT sports <@ ARRAY['RUN','RIDE','SWIM','TRIATHLON','HYROX','STRENGTH','OTHER'] THEN RAISE EXCEPTION 'Check your name and sports'; END IF;
 IF p_complete AND (cardinality(sports)=0 OR NOT primary_sport=ANY(sports) OR primary_sport IS NULL OR coalesce(p_profile->>'weekly_sessions','')='' OR coalesce(p_profile->>'weekly_hours','')='') THEN RAISE EXCEPTION 'Complete your sports and training profile'; END IF;
 IF nullif(p_profile->>'date_of_birth','')::date > current_date THEN RAISE EXCEPTION 'Date of birth cannot be in the future'; END IF;
 INSERT INTO public.athlete_profiles(user_id,full_name,profile_image_url,gender,date_of_birth,city,country,sports,primary_sport,events,goal_name,goal_date,goal_target,weekly_sessions,weekly_hours,running_volume,cycling_volume,swimming_volume,strength_sessions,onboarding_completed)
 VALUES(auth.uid(),full_name,nullif(p_profile->>'profile_image_url',''),p_profile->>'gender',nullif(p_profile->>'date_of_birth','')::date,left(p_profile->>'city',120),left(p_profile->>'country',120),sports,primary_sport,ARRAY(SELECT jsonb_array_elements_text(p_profile->'events')),left(p_profile->>'goal_name',200),nullif(p_profile->>'goal_date','')::date,left(p_profile->>'goal_target',200),p_profile->>'weekly_sessions',p_profile->>'weekly_hours',p_profile->>'running_volume',p_profile->>'cycling_volume',p_profile->>'swimming_volume',p_profile->>'strength_sessions',p_complete)
 ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,profile_image_url=excluded.profile_image_url,gender=excluded.gender,date_of_birth=excluded.date_of_birth,city=excluded.city,country=excluded.country,sports=excluded.sports,primary_sport=excluded.primary_sport,events=excluded.events,goal_name=excluded.goal_name,goal_date=excluded.goal_date,goal_target=excluded.goal_target,weekly_sessions=excluded.weekly_sessions,weekly_hours=excluded.weekly_hours,running_volume=excluded.running_volume,cycling_volume=excluded.cycling_volume,swimming_volume=excluded.swimming_volume,strength_sessions=excluded.strength_sessions,onboarding_completed=public.athlete_profiles.onboarding_completed OR excluded.onboarding_completed,updated_at=now();
 UPDATE public.users SET name=full_name WHERE id=auth.uid();
END;$$;

CREATE FUNCTION sage_review_private.sage_assign_level(p_user_id uuid,p_level smallint,p_note text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF p_level IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sage_level_definitions WHERE id=p_level) THEN RAISE EXCEPTION 'Unknown level'; END IF;
 PERFORM set_config('sage.level_reason',left(coalesce(p_note,''),1000),true);
 PERFORM sage_review_private.admin_set_athlete_level(p_user_id,p_level);
END;$$;

CREATE FUNCTION sage_review_private.sage_challenges(p_admin boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR (p_admin AND NOT sage_review_private.workout_review_is_admin()) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(row ORDER BY row->>'challenge_start' DESC),'[]') FROM (
 SELECT to_jsonb(r)||jsonb_build_object('config',c.config,'revision',c.revision,'eligible_levels',coalesce(re.eligible_levels,ARRAY[1,2]::smallint[]),'participant_count',(SELECT count(*) FROM public.entries WHERE race_id=r.id AND participant_status IN ('ACTIVE','COMPLETED')),'joined',e.id IS NOT NULL AND e.participant_status IN ('ACTIVE','COMPLETED'),'level_at_join',e.level_at_join,'sage_score',coalesce(e.sage_score,0),'rank',CASE WHEN e.id IS NOT NULL AND e.participant_status IN ('ACTIVE','COMPLETED') THEN 1+(SELECT count(*) FROM public.entries other WHERE other.race_id=r.id AND other.participant_status IN ('ACTIVE','COMPLETED') AND (other.sage_score>e.sage_score OR (other.sage_score=e.sage_score AND (other.score_reached_at,other.created_at,other.id)<(e.score_reached_at,e.created_at,e.id)))) ELSE NULL END,'eligibility',CASE WHEN l.level IS NULL THEN 'PENDING_LEVEL_REVIEW' WHEN l.level=ANY(coalesce(re.eligible_levels,ARRAY[1,2]::smallint[])) THEN 'ELIGIBLE' ELSE 'NOT_ELIGIBLE' END) row
 FROM public.races r JOIN public.sage_challenge_configs c ON c.race_id=r.id LEFT JOIN public.race_eligibility re ON re.race_id=r.id LEFT JOIN public.entries e ON e.race_id=r.id AND e.user_id=auth.uid() LEFT JOIN public.athlete_levels l ON l.user_id=auth.uid() WHERE p_admin OR r.status::text<>'draft') q);
END;$$;
CREATE FUNCTION sage_review_private.sage_join_challenge(p_race_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.races; l smallint; allowed smallint[]; entry_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND role::text='athlete' AND status::text='active') THEN RAISE EXCEPTION 'An active athlete membership is required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.races WHERE id=p_race_id FOR UPDATE;
 IF NOT FOUND OR r.status::text<>'open' OR now()>r.challenge_end THEN RAISE EXCEPTION 'This challenge is not accepting entries'; END IF;
 SELECT id INTO entry_id FROM public.entries WHERE race_id=p_race_id AND user_id=auth.uid();
 IF FOUND THEN
  IF EXISTS(SELECT 1 FROM public.entries WHERE id=entry_id AND participant_status IN ('WITHDRAWN','DISQUALIFIED')) THEN RAISE EXCEPTION 'This entry is inactive; contact an administrator'; END IF;
  RETURN entry_id; END IF;
 SELECT level INTO l FROM public.athlete_levels WHERE user_id=auth.uid();
 IF l IS NULL THEN RAISE EXCEPTION 'Your level is under review'; END IF;
 SELECT eligible_levels INTO allowed FROM public.race_eligibility WHERE race_id=p_race_id;
 IF NOT l=ANY(coalesce(allowed,ARRAY[1,2]::smallint[])) THEN RAISE EXCEPTION 'Your level is not eligible for this challenge'; END IF;
 INSERT INTO public.entries(user_id,race_id,sage_score,sessions,total_hours,streak,bonus_points,level_at_join) VALUES(auth.uid(),p_race_id,0,0,0,0,0,l) RETURNING id INTO entry_id;
 RETURN entry_id;
END;$$;

-- Pure threshold evaluator, also mirrored by the shared TypeScript scorer.
CREATE FUNCTION sage_review_private.sage_base_points(p_config jsonb,p_sport text,p_distance numeric,p_seconds integer) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(max((r->>'points')::integer),0) FROM jsonb_array_elements(coalesce(p_config->'scoringRules','[]')) r
 WHERE r->>'sport'=p_sport AND (r->>'threshold')::numeric <= CASE r->>'unit' WHEN 'KM' THEN coalesce(p_distance,0)/1000 WHEN 'METERS' THEN coalesce(p_distance,0) WHEN 'MINUTES' THEN p_seconds::numeric/60 WHEN 'SESSION' THEN 1 ELSE 0 END;
$$;
CREATE FUNCTION sage_review_private.sage_recalculate(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
#variable_conflict use_variable
DECLARE e record; a record; cfg jsonb; base integer; bonus integer; mission jsonb; awards jsonb; uses jsonb; used integer; ok boolean; day_key text; daily jsonb; count_day integer; total integer; previous_total integer; sessions integer; hours numeric; running_hours numeric; streak integer; day_cursor date; mission_streak integer; last_activity uuid; streak_bonus integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 FOR e IN SELECT en.*,r.challenge_start,r.challenge_end,r.sport_types,c.config FROM public.entries en JOIN public.races r ON r.id=en.race_id JOIN public.sage_challenge_configs c ON c.race_id=r.id WHERE en.user_id=p_user_id AND en.participant_status IN ('ACTIVE','COMPLETED') ORDER BY en.id LOOP
  cfg:=e.config; total:=0; sessions:=0; hours:=0; running_hours:=0; daily:='{}'; uses:='{}'; streak:=0;last_activity:=NULL;
  DELETE FROM public.sage_challenge_activities WHERE race_id=e.race_id AND user_id=p_user_id;
  FOR a IN SELECT log.*,coalesce(w.status,'pending') review_status FROM public.activity_logs log LEFT JOIN public.workout_reviews w ON w.activity_id=log.id WHERE log.user_id=p_user_id AND log.sport_type=ANY(e.sport_types) AND coalesce(log.activity_started_at,log.activity_date)>=e.challenge_start AND coalesce(log.activity_started_at,log.activity_date)<=e.challenge_end ORDER BY coalesce(log.activity_started_at,log.activity_date),log.id LOOP
   IF a.review_status<>'approved' THEN
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
CREATE FUNCTION sage_review_private.sage_process_workouts(p_user_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid:=coalesce(p_user_id,auth.uid());
BEGIN
 IF target IS NULL OR (target IS DISTINCT FROM auth.uid() AND coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' AND NOT sage_review_private.workout_review_is_admin()) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM sage_review_private.sage_recalculate(target);
END;$$;

CREATE FUNCTION sage_review_private.sage_board(p_race_id uuid) RETURNS TABLE(payload jsonb,rank bigint,user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',e.id,'user_id',e.user_id,'sage_score',e.sage_score,'rank',row_number() OVER w,'level',e.level_at_join,'sessions',e.sessions,'total_hours',e.total_hours,'streak',e.streak,'user',jsonb_build_object('name',u.name,'avatarUrl',p.profile_image_url)),row_number() OVER w,e.user_id
 FROM public.entries e JOIN public.users u ON u.id=e.user_id LEFT JOIN public.athlete_profiles p ON p.user_id=e.user_id WHERE e.race_id=p_race_id AND EXISTS(SELECT 1 FROM public.races r WHERE r.id=p_race_id AND (r.status::text<>'draft' OR sage_review_private.workout_review_is_admin())) AND e.participant_status IN ('ACTIVE','COMPLETED') WINDOW w AS (ORDER BY e.sage_score DESC,e.score_reached_at,e.created_at,e.id);
$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_board(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION sage_review_private.sage_leaderboard(p_race_id uuid,p_offset integer DEFAULT 0,p_limit integer DEFAULT 50,p_search text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid page'; END IF;
 RETURN jsonb_build_object('athletes',(SELECT coalesce(jsonb_agg(payload ORDER BY rank),'[]') FROM (SELECT * FROM sage_review_private.sage_board(p_race_id) WHERE payload->'user'->>'name' ILIKE '%'||left(coalesce(p_search,''),120)||'%' ORDER BY rank LIMIT p_limit OFFSET p_offset) page),'total',(SELECT count(*) FROM sage_review_private.sage_board(p_race_id) WHERE payload->'user'->>'name' ILIKE '%'||left(coalesce(p_search,''),120)||'%'));
END;$$;
CREATE FUNCTION sage_review_private.sage_around_me(p_race_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE me jsonb; my_rank bigint; ahead integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT payload,rank INTO me,my_rank FROM sage_review_private.sage_board(p_race_id) WHERE user_id=auth.uid();
 SELECT (payload->>'sage_score')::integer INTO ahead FROM sage_review_private.sage_board(p_race_id) WHERE rank=my_rank-1;
 RETURN jsonb_build_object('current',me,'above',(SELECT coalesce(jsonb_agg(payload ORDER BY rank),'[]') FROM sage_review_private.sage_board(p_race_id) WHERE rank BETWEEN my_rank-3 AND my_rank-1),'below',(SELECT coalesce(jsonb_agg(payload ORDER BY rank),'[]') FROM sage_review_private.sage_board(p_race_id) WHERE rank BETWEEN my_rank+1 AND my_rank+3),'summit',(SELECT coalesce(jsonb_agg(payload ORDER BY rank),'[]') FROM sage_review_private.sage_board(p_race_id) WHERE rank<=3),'total',(SELECT count(*) FROM sage_review_private.sage_board(p_race_id)),'nextGap',CASE WHEN ahead IS NULL THEN NULL ELSE ahead-(me->>'sage_score')::integer+1 END);
END;$$;
CREATE FUNCTION sage_review_private.sage_workout_scores(p_activity_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('race_name',r.name)),'[]') FROM public.sage_challenge_activities a JOIN public.races r ON r.id=a.race_id WHERE (a.user_id=auth.uid() OR sage_review_private.workout_review_is_admin()) AND (p_activity_id IS NULL OR activity_id=p_activity_id));
END;$$;

CREATE FUNCTION sage_review_private.sage_athlete_analysis(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE workouts jsonb; n integer; hours numeric; weeks numeric; active_weeks integer; first_date timestamptz; last_date timestamptz; weekly jsonb; sports jsonb; suggestion smallint; reasons jsonb;
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.activity_date DESC,a.id),'[]'),count(*),coalesce(sum(a.moving_time_secs::numeric/3600),0),min(a.activity_date),max(a.activity_date),count(DISTINCT date_trunc('week',a.activity_date)) INTO workouts,n,hours,first_date,last_date,active_weeks FROM (SELECT * FROM public.activity_logs WHERE user_id=p_user_id ORDER BY activity_date DESC,id LIMIT 90) a;
 weeks:=greatest(1,extract(epoch FROM date_trunc('week',last_date)-date_trunc('week',first_date))/604800+1);
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO sports FROM (SELECT sport_type sport,count(*) count,coalesce(sum(distance_meters),0) distance,coalesce(max(distance_meters),0) longest,sum(moving_time_secs::numeric/3600) hours,coalesce(sum(elevation_gain),0) elevation,count(*) FILTER(WHERE indoor IS TRUE) indoor,count(*) FILTER(WHERE indoor IS FALSE) outdoor,count(*) FILTER(WHERE indoor IS NULL) unknown,max(moving_time_secs)/60.0 "longestMinutes",CASE WHEN sum(distance_meters) FILTER(WHERE distance_meters>0 AND moving_time_secs>0)>0 THEN sum(moving_time_secs) FILTER(WHERE distance_meters>0 AND moving_time_secs>0)/60.0/(sum(distance_meters) FILTER(WHERE distance_meters>0 AND moving_time_secs>0)/1000) ELSE NULL END "paceMinutesPerKm" FROM jsonb_to_recordset(workouts) AS a(sport_type text,distance_meters numeric,moving_time_secs integer,elevation_gain numeric,indoor boolean) GROUP BY sport_type) s;
 SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY week),'[]') INTO weekly FROM (SELECT to_char(date_trunc('week',activity_date),'YYYY-MM-DD') week,count(*) count,sum(moving_time_secs::numeric/3600) hours FROM jsonb_to_recordset(workouts) AS a(activity_date timestamptz,moving_time_secs integer) GROUP BY date_trunc('week',activity_date)) w;
 suggestion:=CASE WHEN n<10 THEN NULL WHEN n/weeks>=5 AND active_weeks/weeks>=0.6 THEN 1 ELSE 2 END;
 reasons:=jsonb_build_array(round(n/weeks,1)::text||' workouts/week',round(hours/weeks,1)::text||' training hours/week','Active in '||active_weeks::text||' weeks','Provisional volume-based suggestion; admin approval required');
 RETURN jsonb_build_object('profile',(SELECT to_jsonb(p) FROM public.athlete_profiles p WHERE user_id=p_user_id),'level',(SELECT level FROM public.athlete_levels WHERE user_id=p_user_id),'workouts',workouts,'summary',jsonb_build_object('count',n,'hours',hours,'weeks',weeks,'activeWeeks',active_weeks,'workoutsPerWeek',round(n/weeks,1),'hoursPerWeek',round(hours/weeks,1),'averageMinutes',CASE WHEN n=0 THEN 0 ELSE round(hours*60/n,1) END,'start',first_date,'end',last_date),'sports',sports,'weekly',weekly,'suggestion',jsonb_build_object('level',suggestion,'reasons',CASE WHEN n<10 THEN jsonb_build_array('Not enough workout history for a useful suggestion') ELSE reasons END),'history',(SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY updated_at DESC),'[]') FROM sage_review_private.level_history h WHERE h.user_id=p_user_id));
END;$$;

CREATE FUNCTION sage_review_private.sage_save_challenge(p_challenge jsonb,p_expected_revision integer DEFAULT 0) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE participant uuid; target_race uuid; cfg jsonb; sport_list text[]; levels smallint[]; start_at timestamptz; end_at timestamptz; item jsonb; revision integer; publish boolean;
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 cfg:=p_challenge->'config';sport_list:=ARRAY(SELECT jsonb_array_elements_text(p_challenge->'sport_types'));levels:=ARRAY(SELECT jsonb_array_elements_text(p_challenge->'eligible_levels'))::smallint[];
 IF coalesce(length(trim(p_challenge->>'name')),0) NOT BETWEEN 2 AND 160 OR cardinality(sport_list)=0 OR NOT sport_list <@ ARRAY['Run','Ride','Swim','WeightTraining','CrossFit','Workout','Walk','Hike','Rowing','Yoga'] THEN RAISE EXCEPTION 'Enter a name and supported sports'; END IF;
 IF cfg IS NULL OR jsonb_typeof(cfg)<>'object' OR coalesce(cfg->>'scoringMode','') NOT IN ('LEGACY','THRESHOLD') OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=cfg->>'timezone') THEN RAISE EXCEPTION 'Invalid scoring configuration or timezone'; END IF;
 start_at:=(p_challenge->>'challenge_start')::timestamptz;end_at:=(p_challenge->>'challenge_end')::timestamptz;
 IF start_at IS NULL OR end_at IS NULL OR end_at<=start_at THEN RAISE EXCEPTION 'End must be after start'; END IF;
 IF cfg->>'maxWorkoutsPerDay' IS NOT NULL AND (cfg->>'maxWorkoutsPerDay')::numeric NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Daily cap must be 1 to 100'; END IF;
 IF coalesce(jsonb_typeof(cfg->'scoringRules'),'')<>'array' OR coalesce(jsonb_typeof(cfg->'bonuses'),'')<>'array' OR coalesce(jsonb_typeof(cfg->'rules'),'')<>'array' OR coalesce(jsonb_typeof(cfg->'rewards'),'')<>'array' THEN RAISE EXCEPTION 'Configuration lists are required'; END IF;
 IF coalesce(p_challenge->>'status','') NOT IN ('draft','open','closed') THEN RAISE EXCEPTION 'Invalid challenge status'; END IF;
 publish:=p_challenge->>'status'='open';
 IF publish AND cfg->>'scoringMode'='THRESHOLD' AND jsonb_array_length(cfg->'scoringRules')=0 THEN RAISE EXCEPTION 'Add scoring rules before publishing'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(cfg->'scoringRules') LOOP
  IF NOT coalesce(item->>'sport','')=ANY(sport_list) OR coalesce(item->>'unit','') NOT IN ('KM','METERS','MINUTES','SESSION') OR coalesce((item->>'threshold')::numeric,-1) NOT BETWEEN 0.01 AND 100000 OR coalesce((item->>'points')::numeric,-1) NOT BETWEEN 0 AND 100000 OR (item->>'points')::numeric<>trunc((item->>'points')::numeric) OR coalesce(item->>'id','')='' THEN RAISE EXCEPTION 'Invalid scoring row'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(cfg->'bonuses') LOOP
  IF coalesce(item->>'type','') NOT IN ('EARLY_BIRD','STREAK','OUTDOOR','BRICK','ELEVATION','CUSTOM') OR coalesce((item->>'points')::numeric,-1) NOT BETWEEN 0 AND 10000 OR coalesce((item->>'maxUses')::numeric,1) NOT BETWEEN 1 AND 1000 OR coalesce(item->>'id','')='' THEN RAISE EXCEPTION 'Invalid bonus'; END IF;
  IF coalesce((item->'metadata'->>'hour')::numeric,7) NOT BETWEEN 0 AND 24 OR coalesce((item->'metadata'->>'days')::numeric,3) NOT BETWEEN 1 AND 365 OR coalesce((item->'metadata'->>'gapMinutes')::numeric,60) NOT BETWEEN 0 AND 1440 OR coalesce((item->'metadata'->>'elevation')::numeric,300) NOT BETWEEN 0 AND 100000 OR (item->>'points')::numeric<>trunc((item->>'points')::numeric) OR coalesce((item->>'maxUses')::numeric,1)<>trunc(coalesce((item->>'maxUses')::numeric,1)) THEN RAISE EXCEPTION 'Invalid bonus conditions'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(cfg->'rewards') LOOP
  IF coalesce((item->>'rank')::integer,0)<1 OR coalesce(length(item->>'title'),0)=0 OR coalesce(item->>'id','')='' THEN RAISE EXCEPTION 'Reward rank and title are required'; END IF;
  IF nullif(item->>'imageUrl','') IS NOT NULL AND item->>'imageUrl' !~ '^https://' THEN RAISE EXCEPTION 'Reward image URL must use HTTPS';END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(cfg->'rules') LOOP
  IF coalesce(length(trim(item->>'title')),0)=0 OR coalesce(item->>'id','')='' THEN RAISE EXCEPTION 'Rule title is required';END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_each(cfg) WHERE key IN ('scoringRules','bonuses','rules','rewards') LOOP
  IF jsonb_array_length(item)>100 OR EXISTS(SELECT 1 FROM jsonb_array_elements(item) r GROUP BY r->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'List IDs must be unique and contain at most 100 rows'; END IF;
 END LOOP;
 IF nullif(cfg->>'coverImageUrl','') IS NOT NULL AND cfg->>'coverImageUrl' !~ '^https://' THEN RAISE EXCEPTION 'Cover URL must use HTTPS'; END IF;
 IF cfg->>'maxWorkoutsPerDay' IS NOT NULL AND (cfg->>'maxWorkoutsPerDay')::numeric<>trunc((cfg->>'maxWorkoutsPerDay')::numeric) THEN RAISE EXCEPTION 'Daily cap must be a whole number'; END IF;
 FOR item IN SELECT value FROM jsonb_each(cfg->'legacy') LOOP
  IF (item #>> '{}')::numeric NOT BETWEEN 0 AND 100000 OR (item #>> '{}')::numeric<>trunc((item #>> '{}')::numeric) THEN RAISE EXCEPTION 'Legacy points must be nonnegative integers'; END IF;
 END LOOP;
 target_race:=nullif(p_challenge->>'id','')::uuid;
 IF target_race IS NULL THEN
  INSERT INTO public.races(name,city,sport_types,race_date,challenge_start,challenge_end,status) VALUES(trim(p_challenge->>'name'),nullif(p_challenge->>'city',''),sport_list,end_at::date,start_at,end_at,(p_challenge->>'status')::public.race_status) RETURNING id INTO target_race;
 ELSE
  SELECT c.revision INTO revision FROM public.sage_challenge_configs c WHERE c.race_id=target_race FOR UPDATE;
  IF NOT FOUND OR revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Challenge changed; reload before saving' USING ERRCODE='40001'; END IF;
  UPDATE public.races SET name=trim(p_challenge->>'name'),city=nullif(p_challenge->>'city',''),sport_types=sport_list,race_date=end_at::date,challenge_start=start_at,challenge_end=end_at,status=(p_challenge->>'status')::public.race_status WHERE id=target_race;
 END IF;
 INSERT INTO public.sage_challenge_configs(race_id,config,updated_by) VALUES(target_race,cfg,auth.uid()) ON CONFLICT(race_id) DO UPDATE SET config=excluded.config,revision=public.sage_challenge_configs.revision+1,updated_by=auth.uid(),updated_at=now();
 PERFORM sage_review_private.admin_set_race_eligibility(target_race,levels);
 FOR participant IN SELECT user_id FROM public.entries WHERE public.entries.race_id=target_race ORDER BY user_id LOOP
  PERFORM sage_review_private.sage_recalculate(participant);
 END LOOP;
 RETURN target_race;
END;$$;

-- Expose only invoker wrappers; privileged implementation remains unexposed.
DO $$ DECLARE f record; declarations text; args text; return_type text; BEGIN
 FOR f IN SELECT p.oid,p.proname,pg_get_function_arguments(p.oid) declarations,pg_get_function_identity_arguments(p.oid) identity,pg_get_function_result(p.oid) result FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='sage_review_private' AND p.proname IN ('sage_profile','sage_save_profile','sage_assign_level','sage_challenges','sage_join_challenge','sage_process_workouts','sage_leaderboard','sage_around_me','sage_workout_scores','sage_athlete_analysis','sage_save_challenge') LOOP
  SELECT coalesce(string_agg('$'||i::text,','),'') INTO args FROM generate_series(1,(SELECT pronargs FROM pg_catalog.pg_proc WHERE oid=f.oid)) i;
  EXECUTE format('REVOKE ALL ON FUNCTION sage_review_private.%I(%s) FROM PUBLIC,anon',f.proname,f.identity);
  EXECUTE format('GRANT EXECUTE ON FUNCTION sage_review_private.%I(%s) TO authenticated,service_role',f.proname,f.identity);
  EXECUTE format('CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql SECURITY INVOKER SET search_path='''' AS %L',f.proname,f.declarations,f.result,'SELECT sage_review_private.'||f.proname||'('||args||');');
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon',f.proname,f.identity);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated,service_role',f.proname,f.identity);
 END LOOP;
END;$$;

-- Storage is supplied by Supabase; isolated SQL tests intentionally have no storage schema.
DO $storage$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('sage-avatars','sage-avatars',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
  EXECUTE $policy$CREATE POLICY sage_avatar_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='sage-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)$policy$;
  EXECUTE $policy$CREATE POLICY sage_avatar_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='sage-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text) WITH CHECK(bucket_id='sage-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)$policy$;
  EXECUTE $policy$CREATE POLICY sage_avatar_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='sage-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)$policy$;
 END IF;
END;$storage$;
-- Existing totals now follow the same verified-only policy as subsequent imports and reviews.
DO $$ DECLARE athlete uuid; BEGIN FOR athlete IN SELECT DISTINCT user_id FROM public.entries ORDER BY user_id LOOP PERFORM sage_review_private.sage_recalculate(athlete);END LOOP;END;$$;

-- Restrictive policies also constrain permissive policies from older deployments.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users,public.activity_logs,public.entries,public.races FROM anon;
REVOKE DELETE ON public.users FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.races FROM authenticated;
CREATE POLICY sage_private_users ON public.users AS RESTRICTIVE FOR ALL TO authenticated USING(id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin())) WITH CHECK(id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE POLICY sage_private_workouts ON public.activity_logs AS RESTRICTIVE FOR ALL TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin())) WITH CHECK(user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE POLICY sage_private_entries ON public.entries AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE POLICY sage_published_races ON public.races AS RESTRICTIVE FOR SELECT TO authenticated USING(status::text<>'draft' OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE FUNCTION sage_review_private.protect_membership() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND NOT sage_review_private.workout_review_is_admin() THEN
  IF TG_OP='INSERT' THEN
   IF NEW.role::text<>'athlete' OR NEW.status::text<>'pending' OR NEW.id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'New accounts must start as pending athletes' USING ERRCODE='42501';END IF;
  ELSIF (to_jsonb(NEW)-ARRAY['name','sport_type','payment_screenshot_url']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['name','sport_type','payment_screenshot_url']) THEN
   RAISE EXCEPTION 'Membership and account permissions are managed by administrators' USING ERRCODE='42501';
  END IF;
 END IF;RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.protect_membership() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sage_protect_membership BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION sage_review_private.protect_membership();
-- Public identity contains only names and IDs, never DOB, email, health or tokens.
CREATE FUNCTION sage_review_private.sage_identities(p_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501';END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]') FROM public.users WHERE id=ANY(p_ids));
END;$$;
CREATE FUNCTION public.sage_identities(p_ids uuid[]) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.sage_identities(p_ids);$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_identities(uuid[]),public.sage_identities(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.sage_identities(uuid[]),public.sage_identities(uuid[]) TO authenticated;

-- Material changes to a verified import require a new review, preserving prior decisions.
ALTER TABLE public.workout_reviews DROP CONSTRAINT workout_reviews_status_check;
ALTER TABLE public.workout_reviews ADD CONSTRAINT workout_reviews_status_check CHECK(status IN ('approved','rejected','pending'));
ALTER TABLE public.workout_reviews ALTER COLUMN reviewed_by DROP NOT NULL;
ALTER TABLE public.workout_reviews ALTER COLUMN reviewed_at DROP NOT NULL;
CREATE FUNCTION sage_review_private.invalidate_changed_workout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE review public.workout_reviews;
BEGIN
 IF (NEW.user_id,NEW.sport_type,NEW.activity_date,NEW.activity_started_at,NEW.moving_time_secs,NEW.distance_meters,NEW.elevation_gain,NEW.indoor) IS DISTINCT FROM (OLD.user_id,OLD.sport_type,OLD.activity_date,OLD.activity_started_at,OLD.moving_time_secs,OLD.distance_meters,OLD.elevation_gain,OLD.indoor) THEN
  SELECT * INTO review FROM public.workout_reviews WHERE activity_id=NEW.id FOR UPDATE;
  IF FOUND AND review.status<>'pending' THEN
   UPDATE public.workout_reviews SET status='pending',reason='Imported workout data changed; review required',reviewed_by=NULL,reviewed_at=NULL,revision=revision+1 WHERE activity_id=NEW.id;
   INSERT INTO sage_review_private.workout_review_events(activity_id,previous_status,status,reason,reviewed_by,revision) VALUES(NEW.id,review.status,'pending','Imported workout data changed; review required',coalesce(auth.uid(),review.reviewed_by),review.revision+1);
   PERFORM sage_review_private.sage_recalculate(NEW.user_id);
   IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN PERFORM sage_review_private.sage_recalculate(OLD.user_id);END IF;
  END IF;
 END IF;RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.invalidate_changed_workout() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sage_workout_changed AFTER UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION sage_review_private.invalidate_changed_workout();
-- Definitions drive levels; future additions no longer require changing a 1/2 enum.
ALTER TABLE public.athlete_levels DROP CONSTRAINT athlete_levels_level_check;
ALTER TABLE public.athlete_levels ADD CONSTRAINT sage_defined_level FOREIGN KEY(level) REFERENCES public.sage_level_definitions(id);
ALTER TABLE public.race_eligibility DROP CONSTRAINT race_eligibility_eligible_levels_check;
CREATE OR REPLACE FUNCTION sage_review_private.admin_set_athlete_level(p_user_id uuid,p_level smallint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';END IF;
 IF p_level IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sage_level_definitions WHERE id=p_level) THEN RAISE EXCEPTION 'Unknown athlete level';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND role::text='athlete') THEN RAISE EXCEPTION 'Athlete not found';END IF;
 INSERT INTO public.athlete_levels(user_id,level,updated_by) VALUES(p_user_id,p_level,auth.uid()) ON CONFLICT(user_id) DO UPDATE SET level=excluded.level,updated_by=auth.uid(),updated_at=now();
END;$$;
CREATE OR REPLACE FUNCTION sage_review_private.admin_set_race_eligibility(p_race_id uuid,p_levels smallint[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';END IF;
 IF p_levels IS NULL OR cardinality(p_levels) NOT BETWEEN 1 AND 100 OR EXISTS(SELECT 1 FROM unnest(p_levels) l WHERE l IS NULL OR NOT EXISTS(SELECT 1 FROM public.sage_level_definitions d WHERE d.id=l)) THEN RAISE EXCEPTION 'Select at least one defined level';END IF;
 INSERT INTO public.race_eligibility(race_id,eligible_levels,updated_by) VALUES(p_race_id,ARRAY(SELECT DISTINCT l FROM unnest(p_levels) l ORDER BY l),auth.uid()) ON CONFLICT(race_id) DO UPDATE SET eligible_levels=excluded.eligible_levels,updated_by=auth.uid(),updated_at=now();
END;$$;

CREATE OR REPLACE FUNCTION sage_review_private.admin_level_overview() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('athletes', (
    SELECT coalesce(jsonb_agg(row ORDER BY row->>'name'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('id',u.id,'name',u.name,'email',u.email,'status',u.status,'sport_type',u.sport_type,
        'level',l.level,'workouts',coalesce(a.workouts,0),'distance_meters',coalesce(a.distance,0),'last_activity',a.last_activity) row
      FROM public.users u LEFT JOIN public.athlete_levels l ON l.user_id=u.id
      LEFT JOIN (SELECT user_id,count(*) workouts,sum(distance_meters) distance,max(activity_date) last_activity FROM public.activity_logs GROUP BY user_id) a ON a.user_id=u.id
      WHERE u.role::text='athlete'
    ) athletes), 'races', (SELECT coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object('eligible_levels',coalesce(e.eligible_levels,ARRAY[1,2]::smallint[])) ORDER BY r.challenge_start DESC),'[]'::jsonb)
    FROM public.races r LEFT JOIN public.race_eligibility e ON e.race_id=r.id),
    'entries',(SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'race_id',race_id,'level_at_join',level_at_join,'sage_score',sage_score,'participant_status',participant_status)),'[]'::jsonb) FROM public.entries));
END;
$$;
