CREATE TABLE public.athlete_levels (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  level smallint CHECK (level IN (1,2)),
  updated_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.race_eligibility (
  race_id uuid PRIMARY KEY REFERENCES public.races(id) ON DELETE CASCADE,
  eligible_levels smallint[] NOT NULL CHECK (cardinality(eligible_levels) BETWEEN 1 AND 2 AND eligible_levels <@ ARRAY[1,2]::smallint[]),
  updated_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.athlete_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_eligibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.athlete_levels, public.race_eligibility FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.athlete_levels, public.race_eligibility TO authenticated;
GRANT ALL ON public.athlete_levels, public.race_eligibility TO service_role;
CREATE POLICY athlete_level_read ON public.athlete_levels FOR SELECT TO authenticated
USING (user_id=(SELECT auth.uid()) OR (SELECT sage_review_private.workout_review_is_admin()));
CREATE POLICY race_eligibility_read ON public.race_eligibility FOR SELECT TO authenticated USING (true);

CREATE FUNCTION sage_review_private.admin_level_overview() RETURNS jsonb
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
    'entries',(SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'race_id',race_id)),'[]'::jsonb) FROM public.entries));
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_level_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_level_overview() TO authenticated;
CREATE FUNCTION public.admin_level_overview() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.admin_level_overview(); $$;
REVOKE ALL ON FUNCTION public.admin_level_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_level_overview() TO authenticated;

CREATE FUNCTION sage_review_private.admin_set_athlete_level(p_user_id uuid,p_level smallint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_level IS NOT NULL AND p_level NOT IN (1,2) THEN RAISE EXCEPTION 'Choose Level 1, Level 2 or Under Review' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND role::text='athlete') THEN RAISE EXCEPTION 'Athlete not found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.athlete_levels(user_id,level,updated_by) VALUES(p_user_id,p_level,auth.uid())
  ON CONFLICT(user_id) DO UPDATE SET level=excluded.level,updated_by=excluded.updated_by,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_set_athlete_level(uuid,smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_set_athlete_level(uuid,smallint) TO authenticated;
CREATE FUNCTION public.admin_set_athlete_level(p_user_id uuid,p_level smallint) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.admin_set_athlete_level(p_user_id,p_level); $$;
REVOKE ALL ON FUNCTION public.admin_set_athlete_level(uuid,smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_athlete_level(uuid,smallint) TO authenticated;

CREATE FUNCTION sage_review_private.admin_set_race_eligibility(p_race_id uuid,p_levels smallint[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_levels IS NULL OR cardinality(p_levels) NOT BETWEEN 1 AND 2 OR NOT p_levels <@ ARRAY[1,2]::smallint[] OR array_position(p_levels,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Select at least one eligible level' USING ERRCODE='22023'; END IF;
  INSERT INTO public.race_eligibility(race_id,eligible_levels,updated_by) VALUES(p_race_id,ARRAY(SELECT DISTINCT x FROM unnest(p_levels) x ORDER BY x),auth.uid())
  ON CONFLICT(race_id) DO UPDATE SET eligible_levels=excluded.eligible_levels,updated_by=excluded.updated_by,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_set_race_eligibility(uuid,smallint[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_set_race_eligibility(uuid,smallint[]) TO authenticated;
CREATE FUNCTION public.admin_set_race_eligibility(p_race_id uuid,p_levels smallint[]) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT sage_review_private.admin_set_race_eligibility(p_race_id,p_levels); $$;
REVOKE ALL ON FUNCTION public.admin_set_race_eligibility(uuid,smallint[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_race_eligibility(uuid,smallint[]) TO authenticated;
