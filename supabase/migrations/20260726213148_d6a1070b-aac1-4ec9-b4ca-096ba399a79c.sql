-- N1: Platform admin support surface — additive only.

CREATE TABLE public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  note       text
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL    ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins: self read"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


CREATE OR REPLACE FUNCTION public.is_platform_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _uid
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO service_role;


CREATE TABLE public.admin_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id     uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action            text NOT NULL,
  target_family_id  uuid NULL,
  target_user_id    uuid NULL,
  detail            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_created_at_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_admin_user_id_idx
  ON public.admin_audit_log (admin_user_id);
CREATE INDEX admin_audit_log_target_user_id_idx
  ON public.admin_audit_log (target_user_id)
  WHERE target_user_id IS NOT NULL;
CREATE INDEX admin_audit_log_target_family_id_idx
  ON public.admin_audit_log (target_family_id)
  WHERE target_family_id IS NOT NULL;

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL    ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log: admin read"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));


INSERT INTO public.platform_admins (user_id, note)
VALUES ('55d63ea6-f609-41f3-a358-463a69b5b20d', 'Initial platform admin (kimisaksson@outlook.com)')
ON CONFLICT (user_id) DO NOTHING;
