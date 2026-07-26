-- ============================================================================
-- Phase 5.4: team_accounts (shared, family-bound accounts for household staff)
-- Additive only. Zero changes to existing rows. Existing invite flow untouched
-- except for one guard clause preventing a team account from joining another family.
-- ============================================================================

-- 1) team_accounts table -----------------------------------------------------
CREATE TABLE public.team_accounts (
  family_id       uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text NOT NULL UNIQUE CHECK (username = lower(username) AND length(username) BETWEEN 3 AND 64),
  synthetic_email text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid NOT NULL REFERENCES auth.users(id)
);

GRANT SELECT ON public.team_accounts TO authenticated;
GRANT ALL    ON public.team_accounts TO service_role;
-- No anon grant: enumeration only through the SECURITY DEFINER function below.

ALTER TABLE public.team_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their team account"
  ON public.team_accounts
  FOR SELECT
  TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));
-- No INSERT/UPDATE/DELETE policies: all writes go through the admin server
-- function using service_role, which bypasses RLS.

-- 2) is_team_account helper --------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_accounts WHERE user_id = _user_id);
$$;

REVOKE ALL ON FUNCTION public.is_team_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_account(uuid) TO authenticated;

-- 3) Public username -> synthetic email lookup (pre-auth) --------------------
CREATE OR REPLACE FUNCTION public.lookup_team_email(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT synthetic_email
  FROM public.team_accounts
  WHERE username = lower(_username)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_team_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_team_email(text) TO anon, authenticated;
-- Accepted low-risk limitation: a positive response confirms a given exact
-- username exists. Usernames are `slug(family) + '-' + 4-char random suffix`,
-- so bulk enumeration is impractical, and the response contains only the
-- non-routable synthetic email — no family name, id, or member info.

-- 4) Guard 1 (RESTRICTIVE): team account can never be added to another family
-- Permissive policies OR-combine, so a plain permissive rule here would be
-- bypassed by the existing "Members: owner inserts" policy whenever an owner
-- happens to also own a second family. AS RESTRICTIVE AND-combines with the
-- union of permissive policies, so this predicate MUST hold on every insert.
CREATE POLICY "Team accounts stay in their bound family"
  ON public.family_members
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_team_account(user_id)
    OR family_id = (
      SELECT ta.family_id FROM public.team_accounts ta WHERE ta.user_id = family_members.user_id
    )
  );

-- 5) Guard 2: team accounts cannot accept invites ---------------------------
-- Full body preserved verbatim from the current live definition; the ONLY
-- change is the two-line IF guard added directly after the auth check.
-- Signature unchanged: accept_invite(text, text). No overload created.
CREATE OR REPLACE FUNCTION public.accept_invite(_code text, _display_color text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invites%ROWTYPE;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Phase 5.4 guard: a team account is bound to exactly one family.
  IF public.is_team_account(v_user) THEN
    RAISE EXCEPTION 'Team accounts cannot accept invites';
  END IF;

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

-- Re-apply exactly per 20260614092751 (revoke defaults, grant to authenticated).
REVOKE ALL ON FUNCTION public.accept_invite(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text, text) TO authenticated;