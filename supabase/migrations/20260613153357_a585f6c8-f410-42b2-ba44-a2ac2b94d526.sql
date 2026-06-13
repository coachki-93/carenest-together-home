
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_family_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_family_owner(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_invite(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_invite(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
