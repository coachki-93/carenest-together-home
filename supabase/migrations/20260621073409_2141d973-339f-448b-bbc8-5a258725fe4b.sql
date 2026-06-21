GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.shares_family_with(uuid, uuid) TO authenticated, anon;