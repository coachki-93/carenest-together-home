
-- 1) family_members owner-insert hardening
DROP POLICY IF EXISTS "Members: owner inserts" ON public.family_members;
CREATE POLICY "Members: owner inserts"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_family_owner(family_id, auth.uid())
  OR (
    user_id = auth.uid()
    AND role = 'owner'::member_role
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND f.owner_id = auth.uid()
    )
  )
);

-- 2) Avatar storage SELECT hardening
DROP POLICY IF EXISTS "Avatars: anyone signed in can read" ON storage.objects;
CREATE POLICY "Avatars: family members can read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.shares_family_with(
      NULLIF((storage.foldername(name))[1], '')::uuid,
      auth.uid()
    )
  )
);

-- 3) Revoke EXECUTE on SECURITY DEFINER helpers from anon/public.
--    Trigger functions don't need any role-level EXECUTE.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_family_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_family_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_family_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.suggest_caregiver_profile(uuid, timestamptz) FROM PUBLIC, anon;

-- lookup_invite is intentionally callable by anon (invite landing page before sign-in is not used,
-- but invite acceptance is auth-only). Restrict to authenticated.
REVOKE ALL ON FUNCTION public.lookup_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_invite(text) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_invite(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text, text) TO authenticated;
