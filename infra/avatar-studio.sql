-- Canonical, bounded avatar data. Invoked only by the private dispatcher.
CREATE OR REPLACE FUNCTION ua_social.normalize_avatar(value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path TO '' AS $$
DECLARE result jsonb := '{}'::jsonb; n numeric;
BEGIN
  IF value IS NULL OR jsonb_typeof(value) <> 'object' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  IF value ? 'model' AND (jsonb_typeof(value->'model') <> 'string' OR value->>'model' NOT IN ('classic','atelier','studio')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('model',coalesce(value->>'model','classic'));
  IF value ? 'garment' AND (jsonb_typeof(value->'garment') <> 'string' OR value->>'garment' NOT IN ('jacket','shirt','tshirt','dress')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('garment',coalesce(value->>'garment','jacket'));
  IF value ? 'beard' AND (jsonb_typeof(value->'beard') <> 'string' OR value->>'beard' NOT IN ('none','stubble','full','moustache')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('beard',coalesce(value->>'beard','none'));
  IF value ? 'eyes' AND (jsonb_typeof(value->'eyes') <> 'string' OR value->>'eyes' NOT IN ('#423729','#31546b','#3e6555','#89858c')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('eyes',coalesce(value->>'eyes','#423729'));
  IF value ? 'trousers' AND (jsonb_typeof(value->'trousers') <> 'string' OR value->>'trousers' NOT IN ('#292c33','#eee9df','#31546b','#793a57')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('trousers',coalesce(value->>'trousers','#292c33'));
  IF value ? 'shoes' AND (jsonb_typeof(value->'shoes') <> 'string' OR value->>'shoes' NOT IN ('#17191d','#eee9df','#714b30')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('shoes',coalesce(value->>'shoes','#17191d'));
  IF value ? 'glasses' AND (jsonb_typeof(value->'glasses') <> 'string' OR value->>'glasses' NOT IN ('none','round','square')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('glasses',coalesce(value->>'glasses','none'));
  IF value ? 'frame' AND (jsonb_typeof(value->'frame') <> 'string' OR value->>'frame' NOT IN ('black','tortoise','gold')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('frame',coalesce(value->>'frame','black'));
  IF value ? 'skin' AND (jsonb_typeof(value->'skin') <> 'string' OR value->>'skin' NOT IN ('#f2d3b1','#dca77d','#b87952','#875338','#503528')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('skin',coalesce(value->>'skin','#dca77d'));
  IF value ? 'hair' AND (jsonb_typeof(value->'hair') <> 'string' OR value->>'hair' NOT IN ('#211c1a','#68412c','#c69b55','#d8d5ce','#95335e')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('hair',coalesce(value->>'hair','#211c1a'));
  IF value ? 'outfit' AND (jsonb_typeof(value->'outfit') <> 'string' OR value->>'outfit' NOT IN ('#20242c','#eee9df','#793a57','#31546b','#3e6555','#cc754b')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('outfit',coalesce(value->>'outfit','#31546b'));
  IF value ? 'style' AND (jsonb_typeof(value->'style') <> 'string' OR value->>'style' NOT IN ('short','bob','long','shaved','bald','bun','mohawk')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('style',coalesce(value->>'style','short'));
  IF value ? 'build' AND (jsonb_typeof(value->'build') <> 'string' OR value->>'build' NOT IN ('slim','regular','broad')) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  result := result || jsonb_build_object('build',coalesce(value->>'build','regular'));
  IF value ? 'height' THEN
    IF jsonb_typeof(value->'height') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'height')::numeric;
    IF n < 85 OR n > 115 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('height',n);
  IF value ? 'shoulders' THEN
    IF jsonb_typeof(value->'shoulders') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'shoulders')::numeric;
    IF n < 85 OR n > 115 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('shoulders',n);
  IF value ? 'waist' THEN
    IF jsonb_typeof(value->'waist') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'waist')::numeric;
    IF n < 80 OR n > 120 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('waist',n);
  IF value ? 'hips' THEN
    IF jsonb_typeof(value->'hips') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'hips')::numeric;
    IF n < 85 OR n > 115 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('hips',n);
  IF value ? 'faceWidth' THEN
    IF jsonb_typeof(value->'faceWidth') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'faceWidth')::numeric;
    IF n < 85 OR n > 115 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('faceWidth',n);
  IF value ? 'jaw' THEN
    IF jsonb_typeof(value->'jaw') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'jaw')::numeric;
    IF n < 80 OR n > 120 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('jaw',n);
  IF value ? 'nose' THEN
    IF jsonb_typeof(value->'nose') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'nose')::numeric;
    IF n < 75 OR n > 125 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('nose',n);
  IF value ? 'eyeSize' THEN
    IF jsonb_typeof(value->'eyeSize') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'eyeSize')::numeric;
    IF n < 80 OR n > 120 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('eyeSize',n);
  IF value ? 'lipSize' THEN
    IF jsonb_typeof(value->'lipSize') <> 'number' THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
    n := (value->>'lipSize')::numeric;
    IF n < 75 OR n > 125 OR n <> trunc(n) THEN RAISE EXCEPTION 'ua_invalid_avatar'; END IF;
  ELSE n := 100; END IF;
  result := result || jsonb_build_object('lipSize',n);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION ua_social.normalize_avatar(jsonb) FROM PUBLIC, anon, authenticated;

-- Preserve the deployed dispatcher verbatim except its avatar validation block.
-- The exact old block is required; unexpected drift aborts the transaction.
DO $migration$
DECLARE definition text; old_block text := $old$    if not (a->>'skin'=any(array['#f2d3b1','#dca77d','#b87952','#875338','#503528'])
      and a->>'hair'=any(array['#211c1a','#68412c','#c69b55','#d8d5ce','#95335e'])
      and a->>'outfit'=any(array['#20242c','#eee9df','#793a57','#31546b','#3e6555','#cc754b'])
      and a->>'style'=any(array['short','bob','long','shaved'])
      and a->>'build'=any(array['slim','regular','broad'])) then raise exception 'ua_invalid_avatar'; end if;
    if a->>'skin' is null or a->>'hair' is null or a->>'outfit' is null or a->>'style' is null or a->>'build' is null then raise exception 'ua_invalid_avatar'; end if;
    if coalesce(a->>'model','classic') not in ('classic','atelier') then raise exception 'ua_invalid_avatar'; end if;
    if coalesce(a->>'glasses','none') not in ('none','round','square')
      or coalesce(a->>'frame','black') not in ('black','tortoise','gold') then raise exception 'ua_invalid_avatar'; end if;
    a:=jsonb_build_object('model',coalesce(a->>'model','classic'),'glasses',coalesce(a->>'glasses','none'),'frame',coalesce(a->>'frame','black'),'skin',a->>'skin','hair',a->>'hair','outfit',a->>'outfit','style',a->>'style','build',a->>'build');
$old$;
BEGIN
  definition := pg_get_functiondef('ua_social.dispatch(text,jsonb)'::regprocedure);
  IF strpos(definition,old_block)=0 OR
     (length(definition)-length(replace(definition,old_block,'')))/length(old_block) <> 1
  THEN RAISE EXCEPTION 'Avatar validation changed: review migration'; END IF;
  EXECUTE replace(definition,old_block,$new$    a := ua_social.normalize_avatar(a);
$new$);
END $migration$;
