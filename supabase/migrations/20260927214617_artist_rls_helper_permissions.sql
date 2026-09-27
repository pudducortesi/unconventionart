-- RLS policies call these helpers as the authenticated artist. They inspect
-- only the current user's own membership and return a boolean. Use an empty
-- search_path and explicit grants because both functions are SECURITY DEFINER.
ALTER FUNCTION public.ua_artist_can_manage_work(uuid, text) SET search_path TO '';
ALTER FUNCTION public.ua_artist_capacity_ok(uuid, text, uuid) SET search_path TO '';

REVOKE ALL ON FUNCTION public.ua_artist_can_manage_work(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ua_artist_capacity_ok(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ua_artist_can_manage_work(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ua_artist_capacity_ok(uuid, text, uuid) TO authenticated, service_role;
