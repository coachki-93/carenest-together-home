
CREATE TYPE public.shift_label AS ENUM ('morning', 'afternoon', 'night', 'custom');

CREATE TABLE public.handovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift shift_label NOT NULL DEFAULT 'custom',
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  summary TEXT,
  sleep TEXT,
  mood TEXT,
  seizures TEXT,
  fluids TEXT,
  meds TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX handovers_family_created_idx ON public.handovers (family_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.handovers TO authenticated;
GRANT ALL ON public.handovers TO service_role;

ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view handovers"
  ON public.handovers FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert handovers"
  ON public.handovers FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND author_id = auth.uid());

CREATE POLICY "Authors can update their handovers"
  ON public.handovers FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.is_family_member(family_id, auth.uid()))
  WITH CHECK (author_id = auth.uid() AND public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Authors can delete their handovers"
  ON public.handovers FOR DELETE TO authenticated
  USING (author_id = auth.uid() AND public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER handovers_set_updated_at
  BEFORE UPDATE ON public.handovers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
