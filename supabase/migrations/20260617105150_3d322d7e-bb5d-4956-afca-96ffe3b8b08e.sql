CREATE TABLE public.oxygen_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  tank_type TEXT NOT NULL DEFAULT 'liv_mini_2l',
  flow_lpm NUMERIC NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replaced_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX oxygen_tanks_family_active_idx ON public.oxygen_tanks (family_id, replaced_at);
CREATE INDEX oxygen_tanks_family_started_idx ON public.oxygen_tanks (family_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oxygen_tanks TO authenticated;
GRANT ALL ON public.oxygen_tanks TO service_role;

ALTER TABLE public.oxygen_tanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view oxygen tanks"
  ON public.oxygen_tanks FOR SELECT
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert oxygen tanks"
  ON public.oxygen_tanks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can update oxygen tanks"
  ON public.oxygen_tanks FOR UPDATE
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete oxygen tanks"
  ON public.oxygen_tanks FOR DELETE
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER oxygen_tanks_set_updated_at
  BEFORE UPDATE ON public.oxygen_tanks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();