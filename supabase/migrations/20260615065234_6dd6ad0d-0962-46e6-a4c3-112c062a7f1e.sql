CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_family_member(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = _family_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.is_family_owner(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = _family_id
      AND user_id = _user_id
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION private.shares_family_with(_other_user uuid, _me uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members me
    JOIN public.family_members other ON other.family_id = me.family_id
    WHERE me.user_id = _me
      AND other.user_id = _other_user
  );
$$;

CREATE OR REPLACE FUNCTION private.suggest_caregiver_profile(_family_id uuid, _at timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION private.is_family_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_family_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.shares_family_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.suggest_caregiver_profile(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_family_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_family_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.shares_family_with(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.suggest_caregiver_profile(uuid, timestamptz) TO authenticated, service_role;

DO $$
DECLARE
  pol record;
  using_expr text;
  check_expr text;
  alter_sql text;
BEGIN
  FOR pol IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) ~ '(public\.)?(is_family_member|is_family_owner|shares_family_with|suggest_caregiver_profile)\('
        OR pg_get_expr(p.polwithcheck, p.polrelid) ~ '(public\.)?(is_family_member|is_family_owner|shares_family_with|suggest_caregiver_profile)\('
      )
  LOOP
    using_expr := pol.using_expr;
    check_expr := pol.check_expr;

    IF using_expr IS NOT NULL THEN
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])public\.is_family_member\(', '\1private.is_family_member(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])is_family_member\(', '\1private.is_family_member(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])public\.is_family_owner\(', '\1private.is_family_owner(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])is_family_owner\(', '\1private.is_family_owner(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])public\.shares_family_with\(', '\1private.shares_family_with(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])shares_family_with\(', '\1private.shares_family_with(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])public\.suggest_caregiver_profile\(', '\1private.suggest_caregiver_profile(', 'g');
      using_expr := regexp_replace(using_expr, '(^|[^.[:alnum:]_])suggest_caregiver_profile\(', '\1private.suggest_caregiver_profile(', 'g');
    END IF;

    IF check_expr IS NOT NULL THEN
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])public\.is_family_member\(', '\1private.is_family_member(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])is_family_member\(', '\1private.is_family_member(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])public\.is_family_owner\(', '\1private.is_family_owner(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])is_family_owner\(', '\1private.is_family_owner(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])public\.shares_family_with\(', '\1private.shares_family_with(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])shares_family_with\(', '\1private.shares_family_with(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])public\.suggest_caregiver_profile\(', '\1private.suggest_caregiver_profile(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^.[:alnum:]_])suggest_caregiver_profile\(', '\1private.suggest_caregiver_profile(', 'g');
    END IF;

    alter_sql := format('ALTER POLICY %I ON %I.%I', pol.policy_name, pol.schema_name, pol.table_name);
    IF using_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', using_expr);
    END IF;
    IF check_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', check_expr);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.is_family_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_family_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shares_family_with(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.suggest_caregiver_profile(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shares_family_with(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.suggest_caregiver_profile(uuid, timestamptz) TO service_role;