BEGIN;

-- Cosmetic appearance stays separate from trusted competition levels and scoring.
ALTER TABLE public.athlete_profiles ADD COLUMN avatar jsonb;
ALTER TABLE public.athlete_profiles ADD CONSTRAINT sage_avatar_shape CHECK (
  avatar IS NULL OR (
    jsonb_typeof(avatar) = 'object' AND
    avatar ?& ARRAY['skin','kit','gear','movement'] AND
    avatar - ARRAY['skin','kit','gear','movement'] = '{}'::jsonb AND
    coalesce(avatar->>'skin' IN ('warm','deep','light','dark'),false) AND
    coalesce(avatar->>'kit' IN ('orange','forest','lilac','gold','charcoal'),false) AND
    coalesce(avatar->>'gear' IN ('Cap','Band','None'),false) AND
    coalesce(avatar->>'movement' IN ('Run','Ride','Swim'),false)
  )
);

CREATE FUNCTION sage_review_private.sage_save_avatar(p_name text,p_avatar jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid := auth.uid(); saved jsonb; clean_name text := trim(p_name);
BEGIN
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=owner_id AND role::text='athlete') THEN
   RAISE EXCEPTION 'Athlete sign in required' USING ERRCODE='42501';
 END IF;
 IF coalesce(length(clean_name),0) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Enter an athlete name between 2 and 120 characters'; END IF;
 IF p_avatar IS NULL OR jsonb_typeof(p_avatar) <> 'object' OR
   NOT p_avatar ?& ARRAY['skin','kit','gear','movement'] OR
   p_avatar - ARRAY['skin','kit','gear','movement'] <> '{}'::jsonb OR
   NOT coalesce(p_avatar->>'skin' IN ('warm','deep','light','dark'),false) OR
   NOT coalesce(p_avatar->>'kit' IN ('orange','forest','lilac','gold','charcoal'),false) OR
   NOT coalesce(p_avatar->>'gear' IN ('Cap','Band','None'),false) OR
   NOT coalesce(p_avatar->>'movement' IN ('Run','Ride','Swim'),false) THEN
   RAISE EXCEPTION 'Choose a valid skin tone, kit, gear and movement';
 END IF;
 UPDATE public.athlete_profiles SET full_name=clean_name,avatar=p_avatar,updated_at=now()
 WHERE user_id=owner_id RETURNING avatar INTO saved;
 IF NOT FOUND THEN RAISE EXCEPTION 'Complete your athlete profile before customizing your avatar'; END IF;
 UPDATE public.users SET name=clean_name WHERE id=owner_id;
 RETURN saved;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_save_avatar(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.sage_save_avatar(text,jsonb) TO authenticated,service_role;

CREATE FUNCTION public.sage_save_avatar(p_name text,p_avatar jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT sage_review_private.sage_save_avatar(p_name,p_avatar);
$$;
REVOKE ALL ON FUNCTION public.sage_save_avatar(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sage_save_avatar(text,jsonb) TO authenticated,service_role;

-- Expose only cosmetic settings alongside the existing public leaderboard identity.
CREATE OR REPLACE FUNCTION sage_review_private.sage_board(p_race_id uuid)
RETURNS TABLE(payload jsonb,rank bigint,user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',e.id,'user_id',e.user_id,'sage_score',e.sage_score,'rank',row_number() OVER w,'level',e.level_at_join,'sessions',e.sessions,'total_hours',e.total_hours,'streak',e.streak,'user',jsonb_build_object('name',u.name,'avatarUrl',p.profile_image_url,'avatar',p.avatar)),row_number() OVER w,e.user_id
 FROM public.entries e JOIN public.users u ON u.id=e.user_id LEFT JOIN public.athlete_profiles p ON p.user_id=e.user_id
 WHERE e.race_id=p_race_id AND EXISTS(SELECT 1 FROM public.races r WHERE r.id=p_race_id AND (r.status::text<>'draft' OR sage_review_private.workout_review_is_admin())) AND e.participant_status IN ('ACTIVE','COMPLETED')
 WINDOW w AS (ORDER BY e.sage_score DESC,e.score_reached_at,e.created_at,e.id);
$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_board(uuid) FROM PUBLIC,anon,authenticated;

COMMIT;
