CREATE OR REPLACE FUNCTION public.shares_family_with(_other_user uuid, _me uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members me
    JOIN public.family_members other ON other.family_id = me.family_id
    WHERE me.user_id = _me AND other.user_id = _other_user
  );
$$;

CREATE POLICY "Profiles: read family teammates" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.shares_family_with(id, auth.uid()));