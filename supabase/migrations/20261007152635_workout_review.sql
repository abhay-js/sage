-- Admin decisions are separate from imported data, so re-sync cannot erase them.
CREATE SCHEMA IF NOT EXISTS sage_review_private;
REVOKE ALL ON SCHEMA sage_review_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA sage_review_private TO authenticated;

CREATE OR REPLACE FUNCTION sage_review_private.workout_review_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION sage_review_private.workout_review_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sage_review_private.workout_review_is_admin() TO authenticated, service_role;

-- Prevent clients from granting themselves the role used by moderation RPCs.
CREATE OR REPLACE FUNCTION sage_review_private.protect_workout_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') AND NOT sage_review_private.workout_review_is_admin() THEN
    IF (TG_OP = 'INSERT' AND NEW.role::text = 'admin') OR
       (TG_OP = 'UPDATE' AND (NEW.role::text = 'admin' OR OLD.role::text = 'admin') AND NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Only administrators may change administrator roles' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.protect_workout_admin_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_workout_admin_role ON public.users;
CREATE TRIGGER protect_workout_admin_role BEFORE INSERT OR UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION sage_review_private.protect_workout_admin_role();

CREATE TABLE IF NOT EXISTS public.workout_reviews (
  activity_id uuid PRIMARY KEY REFERENCES public.activity_logs(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('approved', 'rejected')),
  reason text,
  reviewed_by uuid NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  CHECK (status <> 'rejected' OR (reason IS NOT NULL AND length(trim(reason)) >= 3)),
  CHECK (reason IS NULL OR length(reason) <= 1000)
);
ALTER TABLE public.workout_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_reviews FROM anon, authenticated;
GRANT SELECT ON public.workout_reviews TO authenticated;
GRANT ALL ON public.workout_reviews TO service_role;
CREATE POLICY "Athlete sees own workout reviews; admin sees all" ON public.workout_reviews
FOR SELECT TO authenticated USING (
  (SELECT sage_review_private.workout_review_is_admin()) OR EXISTS (
    SELECT 1 FROM public.activity_logs a WHERE a.id = activity_id AND a.user_id = (SELECT auth.uid())
  )
);

CREATE TABLE IF NOT EXISTS sage_review_private.workout_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activity_logs(id) ON DELETE RESTRICT,
  previous_status text NOT NULL,
  status text NOT NULL,
  reason text,
  reviewed_by uuid NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  revision integer NOT NULL
);
ALTER TABLE sage_review_private.workout_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sage_review_private.workout_review_events FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS workout_review_events_activity_idx ON sage_review_private.workout_review_events(activity_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS workout_review_activity_user_date_idx ON public.activity_logs(user_id, activity_date);
CREATE INDEX IF NOT EXISTS workout_review_activity_created_idx ON public.activity_logs(created_at DESC, id);

-- Pending imports retain existing scoring. Only rejected workouts are excluded.
CREATE OR REPLACE FUNCTION sage_review_private.recalculate_reviewed_workouts(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e record; sessions_count integer; hours_total numeric; days text[];
  streak_count integer; day_index integer; day_key text; streak_bonus integer;
BEGIN
  FOR e IN SELECT en.id, en.bonus_points, r.challenge_start, r.challenge_end, r.sport_types
    FROM public.entries en JOIN public.races r ON r.id = en.race_id WHERE en.user_id = p_user_id ORDER BY en.id
  LOOP
    SELECT count(*)::integer, coalesce(sum(a.moving_time_secs::numeric / 3600), 0),
      array_agg(DISTINCT to_char(a.activity_date::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD'))
    INTO sessions_count, hours_total, days
    FROM public.activity_logs a LEFT JOIN public.workout_reviews w ON w.activity_id = a.id
    WHERE a.user_id = p_user_id AND coalesce(w.status, 'pending') <> 'rejected'
      AND a.sport_type::text = ANY(e.sport_types::text[])
      AND a.activity_date::timestamptz >= e.challenge_start::timestamptz
      AND a.activity_date::timestamptz <= e.challenge_end::timestamptz;
    streak_count := 0;
    FOR day_index IN 0..364 LOOP
      day_key := to_char((now() AT TIME ZONE 'UTC')::date - day_index, 'YYYY-MM-DD');
      IF day_key = ANY(coalesce(days, ARRAY[]::text[])) THEN streak_count := streak_count + 1;
      ELSIF streak_count > 0 THEN EXIT;
      END IF;
    END LOOP;
    streak_bonus := CASE WHEN streak_count >= 30 THEN 200 WHEN streak_count >= 7 THEN 50 ELSE 0 END;
    UPDATE public.entries SET sessions = sessions_count, total_hours = hours_total, streak = streak_count,
      sage_score = sessions_count * 10 + floor(hours_total * 15) + streak_bonus + coalesce(e.bonus_points, 0)
    WHERE id = e.id;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.recalculate_reviewed_workouts(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION sage_review_private.admin_workouts(p_user_id uuid, p_status text, p_search text, p_offset integer, p_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; total_count integer;
BEGIN
  IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('all', 'pending', 'approved', 'rejected') OR p_offset < 0 OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Invalid workout filters' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO total_count FROM public.activity_logs a JOIN public.users u ON u.id = a.user_id
  LEFT JOIN public.workout_reviews w ON w.activity_id = a.id
  WHERE (p_user_id IS NULL OR a.user_id = p_user_id)
    AND (p_status = 'all' OR coalesce(w.status, 'pending') = p_status)
    AND (p_search = '' OR u.name ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%' OR a.activity_name ILIKE '%' || p_search || '%');
  SELECT coalesce(jsonb_agg(q.row), '[]'::jsonb) INTO result FROM (
    SELECT to_jsonb(a) || jsonb_build_object(
      'athlete_name',u.name, 'athlete_email',u.email,
      'review_status',coalesce(w.status,'pending'), 'review_reason',w.reason,
      'reviewed_at',w.reviewed_at, 'reviewed_by',w.reviewed_by, 'review_revision',coalesce(w.revision,0),
      'review_history',(SELECT coalesce(jsonb_agg(jsonb_build_object('status',h.status,'reason',h.reason,'reviewed_at',h.reviewed_at,'reviewed_by',h.reviewed_by) ORDER BY h.reviewed_at DESC), '[]'::jsonb)
        FROM sage_review_private.workout_review_events h WHERE h.activity_id = a.id)
    ) AS row
    FROM public.activity_logs a JOIN public.users u ON u.id = a.user_id
    LEFT JOIN public.workout_reviews w ON w.activity_id = a.id
    WHERE (p_user_id IS NULL OR a.user_id = p_user_id)
      AND (p_status = 'all' OR coalesce(w.status, 'pending') = p_status)
      AND (p_search = '' OR u.name ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%' OR a.activity_name ILIKE '%' || p_search || '%')
    ORDER BY a.created_at DESC, a.id LIMIT p_limit OFFSET p_offset
  ) q;
  RETURN jsonb_build_object('workouts', result, 'total', total_count);
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.admin_workouts(uuid,text,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sage_review_private.admin_workouts(uuid,text,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_workouts(p_user_id uuid DEFAULT NULL, p_status text DEFAULT 'pending', p_search text DEFAULT '', p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT sage_review_private.admin_workouts(p_user_id,p_status,p_search,p_offset,p_limit);
$$;
REVOKE ALL ON FUNCTION public.admin_workouts(uuid,text,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_workouts(uuid,text,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION sage_review_private.review_workout(p_activity_id uuid, p_status text, p_reason text, p_expected_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid; locked_owner uuid; old_status text; old_revision integer; decision_reason text;
BEGIN
  IF NOT sage_review_private.workout_review_is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Choose approved or rejected' USING ERRCODE = '22023'; END IF;
  decision_reason := nullif(trim(p_reason), '');
  IF length(decision_reason) > 1000 OR (p_status = 'rejected' AND coalesce(length(decision_reason),0) < 3) THEN
    RAISE EXCEPTION 'Rejection needs a reason of 3 to 1000 characters' USING ERRCODE = '22023';
  END IF;
  SELECT user_id INTO owner_id FROM public.activity_logs WHERE id = p_activity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workout not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  SELECT user_id INTO locked_owner FROM public.activity_logs WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND OR locked_owner IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'Workout changed; refresh the list' USING ERRCODE = '40001'; END IF;
  SELECT status,revision INTO old_status,old_revision FROM public.workout_reviews WHERE activity_id = p_activity_id;
  old_status := coalesce(old_status,'pending'); old_revision := coalesce(old_revision,0);
  IF p_expected_revision IS NULL OR p_expected_revision <> old_revision THEN RAISE EXCEPTION 'Review changed; refresh before deciding' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.workout_reviews(activity_id,status,reason,reviewed_by,reviewed_at,revision)
  VALUES(p_activity_id,p_status,decision_reason,auth.uid(),now(),old_revision+1)
  ON CONFLICT(activity_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,revision=excluded.revision;
  INSERT INTO sage_review_private.workout_review_events(activity_id,previous_status,status,reason,reviewed_by,revision)
  VALUES(p_activity_id,old_status,p_status,decision_reason,auth.uid(),old_revision+1);
  PERFORM sage_review_private.recalculate_reviewed_workouts(owner_id);
  RETURN jsonb_build_object('status',p_status,'revision',old_revision+1);
END;
$$;
REVOKE ALL ON FUNCTION sage_review_private.review_workout(uuid,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sage_review_private.review_workout(uuid,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_workout(p_activity_id uuid, p_status text, p_reason text DEFAULT NULL, p_expected_revision integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT sage_review_private.review_workout(p_activity_id,p_status,p_reason,p_expected_revision);
$$;
REVOKE ALL ON FUNCTION public.review_workout(uuid,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_workout(uuid,text,text,integer) TO authenticated;
