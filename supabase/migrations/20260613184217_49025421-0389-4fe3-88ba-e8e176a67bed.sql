REVOKE EXECUTE ON FUNCTION public.shares_family_with(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.shares_family_with(uuid, uuid) TO authenticated;