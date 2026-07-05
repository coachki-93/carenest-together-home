-- =====================================================================
-- Maintenance: machines + maintenance items + logs
-- =====================================================================

-- Scope enum for maintenance items (whole machine vs a specific part).
DO $$ BEGIN
  CREATE TYPE public.maintenance_scope AS ENUM ('machine', 'part');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- machines
-- ---------------------------------------------------------------------
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view machines"
  ON public.machines FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Material managers can insert machines"
  ON public.machines FOR INSERT TO authenticated
  WITH CHECK (public.is_material_manager(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Material managers can update machines"
  ON public.machines FOR UPDATE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()))
  WITH CHECK (public.is_material_manager(family_id, auth.uid()));

CREATE POLICY "Material managers can delete machines"
  ON public.machines FOR DELETE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()));

CREATE INDEX machines_family_active_idx ON public.machines(family_id, active);

CREATE TRIGGER machines_set_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- maintenance_items
-- ---------------------------------------------------------------------
CREATE TABLE public.maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope public.maintenance_scope NOT NULL DEFAULT 'part',
  interval_days INTEGER,
  last_done_at TIMESTAMPTZ,
  last_done_by UUID,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_items_interval_positive CHECK (interval_days IS NULL OR interval_days > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_items TO authenticated;
GRANT ALL ON public.maintenance_items TO service_role;

ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view maintenance items"
  ON public.maintenance_items FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Material managers can insert maintenance items"
  ON public.maintenance_items FOR INSERT TO authenticated
  WITH CHECK (public.is_material_manager(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Material managers can update maintenance items"
  ON public.maintenance_items FOR UPDATE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()))
  WITH CHECK (public.is_material_manager(family_id, auth.uid()));

CREATE POLICY "Material managers can delete maintenance items"
  ON public.maintenance_items FOR DELETE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()));

CREATE INDEX maintenance_items_machine_idx ON public.maintenance_items(machine_id);
CREATE INDEX maintenance_items_family_active_idx
  ON public.maintenance_items(family_id, active, interval_days);

CREATE TRIGGER maintenance_items_set_updated_at
  BEFORE UPDATE ON public.maintenance_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- maintenance_logs (immutable audit trail)
-- ---------------------------------------------------------------------
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_item_id UUID NOT NULL REFERENCES public.maintenance_items(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.maintenance_logs TO authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view maintenance logs"
  ON public.maintenance_logs FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert maintenance logs"
  ON public.maintenance_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND performed_by = auth.uid());

CREATE POLICY "Family owners can delete maintenance logs"
  ON public.maintenance_logs FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE INDEX maintenance_logs_item_performed_idx
  ON public.maintenance_logs(maintenance_item_id, performed_at DESC);

-- ---------------------------------------------------------------------
-- Atomic mark-done RPC
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_maintenance_done(
  _item_id UUID,
  _note TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_family UUID;
  v_active BOOLEAN;
  v_log_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT family_id, active INTO v_family, v_active
    FROM public.maintenance_items
    WHERE id = _item_id;

  IF v_family IS NULL THEN
    RAISE EXCEPTION 'Maintenance item not found';
  END IF;

  IF NOT public.is_family_member(v_family, v_uid) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;

  IF v_active = false THEN
    RAISE EXCEPTION 'Maintenance item is archived';
  END IF;

  INSERT INTO public.maintenance_logs
    (maintenance_item_id, family_id, performed_by, note)
  VALUES
    (_item_id, v_family, v_uid, NULLIF(btrim(_note), ''))
  RETURNING id INTO v_log_id;

  UPDATE public.maintenance_items
    SET last_done_at = now(),
        last_done_by = v_uid,
        updated_at = now()
    WHERE id = _item_id;

  RETURN v_log_id;
END $$;

REVOKE ALL ON FUNCTION public.mark_maintenance_done(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_maintenance_done(uuid, text) TO authenticated, service_role;
