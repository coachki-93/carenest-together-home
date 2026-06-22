ALTER TABLE public.families ADD COLUMN IF NOT EXISTS at_hospital_since timestamptz;

CREATE OR REPLACE FUNCTION public.set_family_hospital_mode(_family_id uuid, _on boolean)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_family_member(_family_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;
  IF _on THEN
    UPDATE public.families
      SET at_hospital_since = COALESCE(at_hospital_since, now()),
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;
  ELSE
    UPDATE public.families
      SET at_hospital_since = NULL,
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;
  END IF;
  RETURN v_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_family_hospital_mode(uuid, boolean) TO authenticated;