
-- 1. Add invited_email to invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS invited_email text;

-- 2. Create caregiver_profiles table
CREATE TABLE IF NOT EXISTS public.caregiver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  account_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7c9eff',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_family ON public.caregiver_profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_account ON public.caregiver_profiles(account_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_profiles TO authenticated;
GRANT ALL ON public.caregiver_profiles TO service_role;

ALTER TABLE public.caregiver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cg_profiles_select_members" ON public.caregiver_profiles
  FOR SELECT USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "cg_profiles_insert_own_or_owner" ON public.caregiver_profiles
  FOR INSERT WITH CHECK (
    public.is_family_member(family_id, auth.uid())
    AND (account_user_id = auth.uid() OR public.is_family_owner(family_id, auth.uid()))
  );

CREATE POLICY "cg_profiles_update_own_or_owner" ON public.caregiver_profiles
  FOR UPDATE USING (
    account_user_id = auth.uid() OR public.is_family_owner(family_id, auth.uid())
  ) WITH CHECK (
    account_user_id = auth.uid() OR public.is_family_owner(family_id, auth.uid())
  );

CREATE POLICY "cg_profiles_delete_own_or_owner" ON public.caregiver_profiles
  FOR DELETE USING (
    account_user_id = auth.uid() OR public.is_family_owner(family_id, auth.uid())
  );

CREATE TRIGGER caregiver_profiles_updated_at
  BEFORE UPDATE ON public.caregiver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Add caregiver_profile_id to logs and shifts
ALTER TABLE public.med_logs ADD COLUMN IF NOT EXISTS caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.caregiver_shifts ADD COLUMN IF NOT EXISTS caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

-- 4. Tighten medications: writes owner-only (reads stay open to members)
DROP POLICY IF EXISTS "Family members can insert medications" ON public.medications;
DROP POLICY IF EXISTS "Family members can update medications" ON public.medications;
DROP POLICY IF EXISTS "Family members can delete medications" ON public.medications;

CREATE POLICY "Medications: owner insert" ON public.medications
  FOR INSERT WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Medications: owner update" ON public.medications
  FOR UPDATE USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Medications: owner delete" ON public.medications
  FOR DELETE USING (public.is_family_owner(family_id, auth.uid()));

-- 5. Suggest caregiver profile on shift
CREATE OR REPLACE FUNCTION public.suggest_caregiver_profile(_family_id uuid, _at timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.caregiver_profile_id
  FROM public.caregiver_shifts s
  WHERE s.family_id = _family_id
    AND s.caregiver_profile_id IS NOT NULL
    AND s.start_at <= _at
    AND s.end_at >= _at
  ORDER BY (s.end_at - _at) DESC
  LIMIT 1;
$$;
