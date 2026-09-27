-- Keep policy helpers callable by RLS while removing them from public RPC.
CREATE SCHEMA IF NOT EXISTS ua_private;
REVOKE ALL ON SCHEMA ua_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA ua_private TO authenticated, service_role;

ALTER FUNCTION public.ua_artist_can_manage_work(uuid, text) SET SCHEMA ua_private;
ALTER FUNCTION public.ua_artist_capacity_ok(uuid, text, uuid) SET SCHEMA ua_private;
ALTER FUNCTION ua_private.ua_artist_can_manage_work(uuid, text) SET search_path TO '';
ALTER FUNCTION ua_private.ua_artist_capacity_ok(uuid, text, uuid) SET search_path TO '';

REVOKE ALL ON FUNCTION ua_private.ua_artist_can_manage_work(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ua_private.ua_artist_capacity_ok(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ua_private.ua_artist_can_manage_work(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ua_private.ua_artist_capacity_ok(uuid, text, uuid) TO authenticated, service_role;
