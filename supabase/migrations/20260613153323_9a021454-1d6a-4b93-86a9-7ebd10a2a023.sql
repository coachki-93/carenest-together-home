
-- ============ ENUMS ============
CREATE TYPE public.account_type AS ENUM ('family', 'caregiver');
CREATE TYPE public.member_role AS ENUM ('owner', 'caregiver');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  avatar_color TEXT,
  account_type public.account_type NOT NULL DEFAULT 'family',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: read own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FAMILIES ============
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Our Family',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FAMILY MEMBERS ============
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'caregiver',
  display_color TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- ============ Security definer helpers ============
CREATE OR REPLACE FUNCTION public.is_family_member(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = _family_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_owner(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = _family_id AND user_id = _user_id AND role = 'owner'
  );
$$;

-- families policies (need helpers)
CREATE POLICY "Families: members read" ON public.families
  FOR SELECT TO authenticated USING (public.is_family_member(id, auth.uid()));
CREATE POLICY "Families: owner can create" ON public.families
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Families: owner update" ON public.families
  FOR UPDATE TO authenticated USING (public.is_family_owner(id, auth.uid()))
  WITH CHECK (public.is_family_owner(id, auth.uid()));
CREATE POLICY "Families: owner delete" ON public.families
  FOR DELETE TO authenticated USING (public.is_family_owner(id, auth.uid()));

-- family_members policies
CREATE POLICY "Members: see fellow members" ON public.family_members
  FOR SELECT TO authenticated USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Members: owner inserts" ON public.family_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- owner adding themselves on family creation, or owner adding others
    (user_id = auth.uid() AND role = 'owner')
    OR public.is_family_owner(family_id, auth.uid())
  );
CREATE POLICY "Members: update own row" ON public.family_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members: owner can remove" ON public.family_members
  FOR DELETE TO authenticated USING (public.is_family_owner(family_id, auth.uid()) OR user_id = auth.uid());

-- ============ CHILDREN ============
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  photo_url TEXT,
  diagnosis TEXT,
  allergies TEXT,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  doctors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children: members read" ON public.children
  FOR SELECT TO authenticated USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Children: owner insert" ON public.children
  FOR INSERT TO authenticated WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Children: owner update" ON public.children
  FOR UPDATE TO authenticated USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Children: owner delete" ON public.children
  FOR DELETE TO authenticated USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER trg_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVITES ============
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites: family members read" ON public.invites
  FOR SELECT TO authenticated USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Invites: owner manage" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Invites: owner update" ON public.invites
  FOR UPDATE TO authenticated USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Invites: owner delete" ON public.invites
  FOR DELETE TO authenticated USING (public.is_family_owner(family_id, auth.uid()));

-- Lookup invite by code (security definer so caregivers can preview before joining)
CREATE OR REPLACE FUNCTION public.lookup_invite(_code TEXT)
RETURNS TABLE (
  invite_id UUID,
  family_id UUID,
  family_name TEXT,
  status public.invite_status,
  expires_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.family_id, f.name, i.status, i.expires_at
  FROM public.invites i
  JOIN public.families f ON f.id = i.family_id
  WHERE i.code = _code
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_invite(TEXT) TO authenticated;

-- Accept invite atomically
CREATE OR REPLACE FUNCTION public.accept_invite(_code TEXT, _display_color TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.invites%ROWTYPE;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_invite FROM public.invites WHERE code = _code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'Invite has expired'; END IF;

  INSERT INTO public.family_members (family_id, user_id, role, display_color)
  VALUES (v_invite.family_id, v_user, 'caregiver', _display_color)
  ON CONFLICT (family_id, user_id) DO NOTHING;

  UPDATE public.invites
  SET status = 'accepted', accepted_by = v_user, accepted_at = now()
  WHERE id = v_invite.id;

  UPDATE public.profiles SET onboarded = true WHERE id = v_user;

  RETURN v_invite.family_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, TEXT) TO authenticated;

-- ============ AUTO PROFILE on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'account_type')::public.account_type, 'family')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE policies for avatars bucket ============
-- Files live at avatars/<user_id>/<filename>
CREATE POLICY "Avatars: anyone signed in can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "Avatars: users upload to their folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars: users update their files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars: users delete their files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
