BEGIN;
CREATE TEMP TABLE avatar_v2_before AS SELECT user_id,full_name,avatar FROM public.athlete_profiles;
CREATE TEMP TABLE avatar_v2_scores AS SELECT id,sage_score,level_at_join FROM public.entries;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.users WHERE email='dev.user1@sage.test'),true);
SET LOCAL ROLE authenticated;
SELECT public.sage_save_avatar('Avatar Builder Test','{"skin":"warm","kit":"forest","gear":"None","movement":"Run","appearance":{"skin":"t5","face":"oval","ears":"medium","details":"none","eyes":"focused","eyeColor":"brown","lashes":"none","brows":"angled","nose":"small","mouth":"smile","facial":"stubble","hair":"braids","hairColor":"black","build":"athletic","height":"medium","top":"teamjersey","topColor":"purple","pattern":"plain","bottom":"shorts","bottomColor":"ink","socks":"ankle","sockColor":"white","shoes":"runner","shoeColor":"white","headwear":"hijab","eyewear":"none","earwear":"none","neckwear":"none","wrist":"watch","hands":"none","back":"none","pose":"wave"}}'::jsonb);
DO $$ DECLARE original jsonb := '{"skin":"warm","kit":"forest","gear":"None","movement":"Run","appearance":{"skin":"t5","face":"oval","ears":"medium","details":"none","eyes":"focused","eyeColor":"brown","lashes":"none","brows":"angled","nose":"small","mouth":"smile","facial":"stubble","hair":"braids","hairColor":"black","build":"athletic","height":"medium","top":"teamjersey","topColor":"purple","pattern":"plain","bottom":"shorts","bottomColor":"ink","socks":"ankle","sockColor":"white","shoes":"runner","shoeColor":"white","headwear":"hijab","eyewear":"none","earwear":"none","neckwear":"none","wrist":"watch","hands":"none","back":"none","pose":"wave"}}'::jsonb; allowed jsonb := '{"face":["oval","round","angular","square","long","heart"],"ears":["small","medium","large"],"details":["none","freckles","blush","dimples","mole","lines"],"eyes":["big","round","almond","focused","sharp","hooded"],"lashes":["none","short","long"],"brows":["straight","arched","angled","thick","thin","bushy"],"nose":["button","small","round","long","wide","pointed"],"mouth":["smile","grin","teeth","smirk","open","serious"],"facial":["none","stubble","moustache","goatee","beard","fullbeard","chinstrap"],"hair":["spiky","crop","sidepart","quiff","curly","afro","buzz","bald","mohawk","manbun","bun","ponytail","highpony","braids","long","bob"],"build":["lean","athletic","strong","solid","curvy"],"height":["short","medium","tall"],"top":["singlet","tee","longsleeve","jersey","bra","crop","hoodie","compression","trisuit","teamjersey"],"pattern":["plain","stripe","chevron","panel","number"],"bottom":["split","shorts","longshorts","tights","capri","bib","trackpants","skort"],"socks":["none","ankle","crew","knee"],"sockColor":["white","ink","match"],"shoes":["runner","trainer","hightop","cycling"],"headwear":["none","headband","cap","backcap","visor","beanie","helmet","swimcap","patka","hijab"],"eyewear":["none","shades","round","square","goggles"],"earwear":["none","earbuds","headphones"],"neckwear":["none","medal","towel"],"wrist":["none","watch","sweatbands"],"hands":["none","gloves","bottle"],"back":["none","vest"],"pose":["stand","step","reach","flex","wave"],"skin":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],"eyeColor":["brown","dark","hazel","green","blue","grey"],"hairColor":["black","darkbrown","brown","chestnut","auburn","ginger","blonde","platinum","grey","white","blue","pink","green"],"topColor":["ink","charcoal","white","sage","mint","gold","orange","red","pink","purple","sky","navy"],"bottomColor":["ink","charcoal","white","sage","mint","gold","orange","red","pink","purple","sky","navy"],"shoeColor":["ink","charcoal","white","sage","mint","gold","orange","red","pink","purple","sky","navy"]}'::jsonb; k text; options jsonb; v text; item jsonb; accepted boolean; BEGIN
 IF public.sage_profile()->'profile'->'avatar' <> original THEN RAISE EXCEPTION 'Appearance did not persist'; END IF;
 FOR k,options IN SELECT key,value FROM jsonb_each(allowed) LOOP
  FOR v IN SELECT jsonb_array_elements_text(options) LOOP
   IF NOT sage_review_private.sage_avatar_is_valid(jsonb_set(original,ARRAY['appearance',k],to_jsonb(v))) THEN RAISE EXCEPTION 'Valid option rejected: %/%',k,v; END IF;
  END LOOP;
  IF sage_review_private.sage_avatar_is_valid(jsonb_set(original,ARRAY['appearance',k],'"invalid"'::jsonb)) THEN RAISE EXCEPTION 'Invalid option accepted: %',k; END IF;
  IF sage_review_private.sage_avatar_is_valid(jsonb_set(original,ARRAY['appearance',k],'null'::jsonb)) THEN RAISE EXCEPTION 'Null option accepted: %',k; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(jsonb_build_array(original||'{"level":99}'::jsonb,jsonb_set(original,'{appearance}','{}'::jsonb),jsonb_set(original,'{appearance}','null'::jsonb),jsonb_set(original,'{appearance,level}','99'::jsonb),original#-'{appearance,hair}')) LOOP
  accepted:=false;
  BEGIN PERFORM public.sage_save_avatar('Invalid Avatar',item); accepted:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
  IF accepted THEN RAISE EXCEPTION 'Invalid appearance accepted'; END IF;
 END LOOP;
 PERFORM public.sage_save_avatar('Legacy Avatar','{"skin":"deep","kit":"lilac","gear":"Band","movement":"Ride"}'::jsonb);
END;$$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.athlete_profiles p JOIN avatar_v2_before b USING(user_id) WHERE p.user_id<>auth.uid() AND (p.full_name IS DISTINCT FROM b.full_name OR p.avatar IS DISTINCT FROM b.avatar)) THEN RAISE EXCEPTION 'Another athlete changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.entries e JOIN avatar_v2_scores b USING(id) WHERE e.sage_score IS DISTINCT FROM b.sage_score OR e.level_at_join IS DISTINCT FROM b.level_at_join) THEN RAISE EXCEPTION 'Cosmetic changes affected competition data'; END IF;
 IF has_function_privilege('anon','public.sage_save_avatar(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous avatar writes enabled'; END IF;
END;$$;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE accepted boolean:=false; BEGIN
 BEGIN PERFORM public.sage_save_avatar('Unsigned Athlete','{"skin":"warm","kit":"forest","gear":"None","movement":"Run","appearance":{"skin":"t5","face":"oval","ears":"medium","details":"none","eyes":"focused","eyeColor":"brown","lashes":"none","brows":"angled","nose":"small","mouth":"smile","facial":"stubble","hair":"braids","hairColor":"black","build":"athletic","height":"medium","top":"teamjersey","topColor":"purple","pattern":"plain","bottom":"shorts","bottomColor":"ink","socks":"ankle","sockColor":"white","shoes":"runner","shoeColor":"white","headwear":"hijab","eyewear":"none","earwear":"none","neckwear":"none","wrist":"watch","hands":"none","back":"none","pose":"wave"}}'::jsonb);accepted:=true;EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF accepted THEN RAISE EXCEPTION 'Unsigned appearance write accepted';END IF;
END;$$;
RESET ROLE;
SELECT 'PASS: full appearance persistence, all 206 choices, invalid/missing/extra field rejection, legacy compatibility, owner isolation, unchanged scores and unauthenticated denial' AS result;
ROLLBACK;
