ALTER TABLE public.oxygen_tanks
  ADD COLUMN pause_reason text,
  ADD COLUMN paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN paused_caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.oxygen_tanks
  ADD CONSTRAINT oxygen_tanks_pause_reason_check
  CHECK (pause_reason IS NULL OR pause_reason IN ('hospital', 'manual'));

UPDATE public.oxygen_tanks
  SET pause_reason = 'hospital'
  WHERE paused_at IS NOT NULL AND pause_reason IS NULL;

CREATE OR REPLACE FUNCTION public.set_oxygen_tank_paused(
  _tank_id uuid,
  _paused boolean,
  _caregiver_profile_id uuid DEFAULT NULL
)
RETURNS public.oxygen_tanks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.oxygen_tanks%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM public.oxygen_tanks WHERE id = _tank_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tank not found'; END IF;
  IF NOT public.is_family_member(v_row.family_id, v_uid) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;
  IF v_row.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'Tank is no longer active';
  END IF;
  IF NOT public.caregiver_profile_in_family(_caregiver_profile_id, v_row.family_id) THEN
    RAISE EXCEPTION 'Caregiver profile does not belong to this family';
  END IF;

  IF _paused THEN
    IF v_row.paused_at IS NOT NULL THEN
      RAISE EXCEPTION 'Tank is already paused';
    END IF;
    UPDATE public.oxygen_tanks
      SET paused_at = now(),
          pause_reason = 'manual',
          paused_by = v_uid,
          paused_caregiver_profile_id = _caregiver_profile_id,
          updated_at = now()
      WHERE id = _tank_id
      RETURNING * INTO v_row;
  ELSE
    IF v_row.paused_at IS NULL THEN
      RAISE EXCEPTION 'Tank is not paused';
    END IF;
    IF v_row.pause_reason IS NOT NULL AND v_row.pause_reason <> 'manual' THEN
      RAISE EXCEPTION 'Tank is paused by hospital mode — turn off hospital mode to resume';
    END IF;
    UPDATE public.oxygen_tanks
      SET paused_seconds = paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::bigint),
          paused_at = NULL,
          pause_reason = NULL,
          paused_by = NULL,
          paused_caregiver_profile_id = NULL,
          last_checked_at = now(),
          updated_at = now()
      WHERE id = _tank_id
      RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_oxygen_tank_paused(uuid, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_oxygen_tank_paused(uuid, boolean, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.set_family_hospital_mode(uuid, boolean);

CREATE OR REPLACE FUNCTION public.set_family_hospital_mode(_family_id uuid, _on boolean, _paused jsonb DEFAULT NULL::jsonb)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_family_owner(_family_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the family owner can change hospital mode';
  END IF;
  IF _on THEN
    UPDATE public.families
      SET at_hospital_since = COALESCE(at_hospital_since, now()),
          hospital_paused = COALESCE(_paused, hospital_paused),
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    UPDATE public.oxygen_tanks
      SET paused_at = now(),
          pause_reason = 'hospital',
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NULL
        AND (
          SELECT COALESCE((f.hospital_paused ->> 'oxygen')::boolean, true)
          FROM public.families f WHERE f.id = _family_id
        );
  ELSE
    UPDATE public.families
      SET at_hospital_since = NULL,
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    UPDATE public.oxygen_tanks
      SET paused_seconds = paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::bigint),
          paused_at = NULL,
          pause_reason = NULL,
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NOT NULL
        AND (pause_reason = 'hospital' OR pause_reason IS NULL);
  END IF;
  RETURN v_ts;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_family_hospital_mode(uuid, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_family_hospital_mode(uuid, boolean, jsonb) TO authenticated, service_role;