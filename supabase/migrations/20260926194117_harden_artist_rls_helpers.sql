-- Reconstructed from the production function definitions and ACL on 2026-09-27.
CREATE OR REPLACE FUNCTION public.ua_artist_can_manage_work(p_owner uuid, p_room text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_artists ga
    WHERE ga.user_id = (SELECT auth.uid())
      AND ga.active AND ga.user_id = p_owner AND ga.room_slug = p_room
  )
$$;

CREATE OR REPLACE FUNCTION public.ua_artist_capacity_ok(p_owner uuid, p_room text, p_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_artists ga
    WHERE ga.user_id = (SELECT auth.uid())
      AND ga.active AND ga.user_id = p_owner AND ga.room_slug = p_room
      AND (
        SELECT count(*) FROM public.gallery_artworks w
        WHERE w.owner_user_id = p_owner AND w.room_slug = p_room AND w.id <> p_id
      ) < ga.capacity
  )
$$;

REVOKE ALL ON FUNCTION public.ua_artist_can_manage_work(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ua_artist_capacity_ok(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ua_artist_can_manage_work(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ua_artist_capacity_ok(uuid, text, uuid) TO service_role;
