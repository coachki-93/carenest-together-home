CREATE OR REPLACE FUNCTION public.set_family_founding_member()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.founding_member := now() < timestamptz '2027-01-01 00:00 Europe/Stockholm';
  ELSE
    NEW.founding_member := OLD.founding_member;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER families_set_founding_member
BEFORE INSERT OR UPDATE OF founding_member ON public.families
FOR EACH ROW EXECUTE FUNCTION public.set_family_founding_member();