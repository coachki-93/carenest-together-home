
-- 1) Medication → inventory link + cached per-dose amount.
ALTER TABLE public.medications
  ADD COLUMN inventory_item_id uuid
    REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN inventory_per_dose numeric
    CHECK (inventory_per_dose IS NULL OR inventory_per_dose > 0);

CREATE INDEX medications_inventory_item_id_idx
  ON public.medications(inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

-- 2) Audit-row back-pointer + caregiver attribution parity.
ALTER TABLE public.inventory_adjustments
  ADD COLUMN source_med_log_id uuid
    REFERENCES public.med_logs(id) ON DELETE SET NULL,
  ADD COLUMN caregiver_profile_id uuid
    REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

-- One dose-driven adjustment per med_log, ever. The trigger updates in place
-- by DELETE+INSERT under this uniqueness invariant.
CREATE UNIQUE INDEX inventory_adjustments_source_med_log_uk
  ON public.inventory_adjustments(source_med_log_id)
  WHERE source_med_log_id IS NOT NULL;

-- 3) Reconciliation trigger.
--
-- Strategy: on any relevant med_logs write, first REVERSE the existing
-- dose-driven adjustment for the affected log (using OLD), then RE-APPLY
-- based on NEW (skipped for DELETE). This makes the state machine trivial:
-- medication reassignment, status flip, and note-only edits all collapse
-- into "reverse-then-reapply" and produce the correct end state.
--
-- Symmetry: we store the EFFECTIVE (clamped) delta on the adjustment. Undo
-- adds back exactly -A.delta, so an item that clamped to 0 restores
-- correctly — no phantom stock, no lost stock.
--
-- Principle 7 (never block a dose): if the item cannot be located, the med
-- is unlinked, per-dose is NULL, or stock is already 0, the dose write
-- still succeeds; no adjustment row is created.
CREATE OR REPLACE FUNCTION public.reconcile_med_dose_stock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_adj      public.inventory_adjustments%ROWTYPE;
  v_med      public.medications%ROWTYPE;
  v_item_qty numeric;
  v_next_qty numeric;
  v_delta    numeric;
BEGIN
  -- 1) Reverse any prior dose-driven adjustment for this log.
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT * INTO v_adj
      FROM public.inventory_adjustments
      WHERE source_med_log_id = OLD.id;
    IF FOUND THEN
      UPDATE public.inventory_items
        SET quantity = quantity + (-v_adj.delta)
        WHERE id = v_adj.inventory_item_id;
      DELETE FROM public.inventory_adjustments WHERE id = v_adj.id;
    END IF;
  END IF;

  -- 2) DELETE: no re-apply.
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- 3) Re-apply for NEW when the log counts.
  IF NEW.status <> 'given' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_med FROM public.medications WHERE id = NEW.medication_id;
  IF NOT FOUND
     OR v_med.inventory_item_id IS NULL
     OR v_med.inventory_per_dose IS NULL
     OR v_med.inventory_per_dose <= 0 THEN
    RETURN NEW;
  END IF;

  -- Lock the item row while computing + writing effective delta.
  SELECT quantity INTO v_item_qty
    FROM public.inventory_items
    WHERE id = v_med.inventory_item_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_next_qty := GREATEST(0, v_item_qty - v_med.inventory_per_dose);
  v_delta    := v_next_qty - v_item_qty;  -- <= 0, matches adjustInventory semantics

  IF v_delta = 0 THEN
    -- Already at 0. Dose still logs; no audit row (nothing was taken).
    RETURN NEW;
  END IF;

  UPDATE public.inventory_items
    SET quantity = v_next_qty
    WHERE id = v_med.inventory_item_id;

  INSERT INTO public.inventory_adjustments
    (family_id, inventory_item_id, delta, reason, note, performed_by,
     caregiver_profile_id, source_med_log_id)
  VALUES
    (NEW.family_id, v_med.inventory_item_id, v_delta, 'med_dose', NULL,
     NEW.given_by, NEW.caregiver_profile_id, NEW.id);

  RETURN NEW;
END;
$$;

-- Scoped to status / medication_id changes to avoid churn on note-only edits.
DROP TRIGGER IF EXISTS med_logs_reconcile_stock ON public.med_logs;
CREATE TRIGGER med_logs_reconcile_stock
  AFTER INSERT OR UPDATE OF status, medication_id OR DELETE
  ON public.med_logs
  FOR EACH ROW EXECUTE FUNCTION public.reconcile_med_dose_stock();
