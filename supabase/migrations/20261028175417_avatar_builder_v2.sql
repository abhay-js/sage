BEGIN;
-- Cosmetic appearance only. Existing avatars and score/level permissions are unchanged.
CREATE OR REPLACE FUNCTION sage_review_private.sage_avatar_is_valid(p_avatar jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE allowed jsonb := '{"face":["oval","round","angular","square","long","heart"],"ears":["small","medium","large"],"details":["none","freckles","blush","dimples","mole","lines"],"eyes":["big","round","almond","focused","sharp","hooded"],"lashes":["none","short","long"],"brows":["straight","arched","angled","thick","thin","bushy"],"nose":["button","small","round","long","wide","pointed"],"mouth":["smile","grin","teeth","smirk","open","serious"],"facial":["none","stubble","moustache","goatee","beard","fullbeard","chinstrap"],"hair":["spiky","crop","sidepart","quiff","curly","afro","buzz","bald","mohawk","manbun","bun","ponytail","highpony","braids","long","bob"],"build":["lean","athletic","strong","solid","curvy"],"height":["short","medium","tall"],"top":["singlet","tee","longsleeve","jersey","bra","crop","hoodie","compression","trisuit","teamjersey"],"pattern":["plain","stripe","chevron","panel","number"],"bottom":["split","shorts","longshorts","tights","capri","bib","trackpants","skort"],"socks":["none","ankle","crew","knee"],"sockColor":["white","ink","match"],"shoes":["runner","trainer","hightop","cycling"],"headwear":["none","headband","cap","backcap","visor","beanie","helmet","swimcap","patka","hijab"],"eyewear":["none","shades","round","square","goggles"],"earwear":["none","earbuds","headphones"],"neckwear":["none","medal","towel"],"wrist":["none","watch","sweatbands"],"hands":["none","gloves","bottle"],"back":["none","vest"],"pose":["stand","step","reach","flex","wave"],"skin":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],"eyeColor":["brown","dark","hazel","green","blue","grey"],"hairColor":["black","darkbrown","brown","chestnut","auburn","ginger","blonde","platinum","grey","white","blue","pink","green"],"topColor":["ink","charcoal","white","sage","mint","gold","orange","red","pink","purple","sky","navy"],"bottomColor":["ink","charcoal","white","sage","mint","gold","orange","red","pink","purple","sky","navy"],"shoeColor":["ink","charcoal","white","sage","mint","gold","orange","red","pink","purple","sky","navy"]}'::jsonb; a jsonb; k text; choices jsonb;
BEGIN
 IF jsonb_typeof(p_avatar) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT p_avatar ?& ARRAY['skin','kit','gear','movement'] OR
  p_avatar - ARRAY['skin','kit','gear','movement','appearance'] <> '{}'::jsonb OR
  NOT coalesce(p_avatar->>'skin' IN ('warm','deep','light','dark'),false) OR
  NOT coalesce(p_avatar->>'kit' IN ('orange','forest','lilac','gold','charcoal'),false) OR
  NOT coalesce(p_avatar->>'gear' IN ('Cap','Band','None'),false) OR
  NOT coalesce(p_avatar->>'movement' IN ('Run','Ride','Swim'),false) THEN RETURN false; END IF;
 IF p_avatar ? 'appearance' THEN
  a:=p_avatar->'appearance';
  IF jsonb_typeof(a) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(a)) <> (SELECT count(*) FROM jsonb_object_keys(allowed)) THEN RETURN false; END IF;
  FOR k,choices IN SELECT key,value FROM jsonb_each(allowed) LOOP
   IF jsonb_typeof(a->k) IS DISTINCT FROM 'string' OR NOT coalesce(choices ? (a->>k),false) THEN RETURN false; END IF;
  END LOOP;
 END IF;
 RETURN true;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_avatar_is_valid(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.sage_avatar_is_valid(jsonb) TO authenticated,service_role;
ALTER TABLE public.athlete_profiles DROP CONSTRAINT sage_avatar_shape;
ALTER TABLE public.athlete_profiles ADD CONSTRAINT sage_avatar_shape CHECK (avatar IS NULL OR sage_review_private.sage_avatar_is_valid(avatar));
CREATE OR REPLACE FUNCTION sage_review_private.sage_save_avatar(p_name text,p_avatar jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid := auth.uid(); saved jsonb; clean_name text := trim(p_name);
BEGIN
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=owner_id AND role::text='athlete') THEN
  RAISE EXCEPTION 'Athlete sign in required' USING ERRCODE='42501';
 END IF;
 IF coalesce(length(clean_name),0) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Enter an athlete name between 2 and 120 characters'; END IF;
 IF NOT sage_review_private.sage_avatar_is_valid(p_avatar) THEN RAISE EXCEPTION 'Choose valid athlete appearance options'; END IF;
 UPDATE public.athlete_profiles SET full_name=clean_name,avatar=p_avatar,updated_at=now() WHERE user_id=owner_id RETURNING avatar INTO saved;
 IF NOT FOUND THEN RAISE EXCEPTION 'Complete your athlete profile before customizing your avatar'; END IF;
 UPDATE public.users SET name=clean_name WHERE id=owner_id;
 RETURN saved;
END;$$;
REVOKE ALL ON FUNCTION sage_review_private.sage_save_avatar(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION sage_review_private.sage_save_avatar(text,jsonb) TO authenticated,service_role;
COMMIT;
