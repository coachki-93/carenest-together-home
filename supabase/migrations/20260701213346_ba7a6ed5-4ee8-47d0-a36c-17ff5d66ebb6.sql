-- Rich condition details
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS condition_details text;

-- Emergency steps
DO $$ BEGIN
  CREATE TYPE public.emergency_step_severity AS ENUM ('critical','monitor','info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.emergency_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  severity public.emergency_step_severity NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_steps TO authenticated;
GRANT ALL ON public.emergency_steps TO service_role;

ALTER TABLE public.emergency_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members read emergency steps"
  ON public.emergency_steps FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Owners insert emergency steps"
  ON public.emergency_steps FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Owners update emergency steps"
  ON public.emergency_steps FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Owners delete emergency steps"
  ON public.emergency_steps FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE INDEX IF NOT EXISTS emergency_steps_family_pos_idx
  ON public.emergency_steps(family_id, position);

CREATE TRIGGER emergency_steps_set_updated_at
  BEFORE UPDATE ON public.emergency_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();