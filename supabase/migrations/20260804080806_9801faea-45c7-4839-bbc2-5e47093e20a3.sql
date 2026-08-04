CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reporter_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  family_id       UUID REFERENCES public.families(id) ON DELETE SET NULL,
  submitter_email TEXT,
  page_context    TEXT,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','resolved')),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS bug_reports_status_created_idx
  ON public.bug_reports (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_self" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "bug_reports_select_admin" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "bug_reports_update_admin" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER bug_reports_set_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();