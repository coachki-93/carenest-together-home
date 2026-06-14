
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.shares_family_with(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.suggest_caregiver_profile(uuid, timestamptz) FROM authenticated;
