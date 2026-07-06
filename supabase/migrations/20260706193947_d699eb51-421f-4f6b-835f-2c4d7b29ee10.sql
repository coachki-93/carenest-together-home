
CREATE OR REPLACE FUNCTION public.guard_family_member_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_family_owner(OLD.family_id, auth.uid()) THEN
    NEW.role := OLD.role;
    NEW.material_responsible := OLD.material_responsible;
    NEW.family_id := OLD.family_id;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS family_members_guard_privileges ON public.family_members;
CREATE TRIGGER family_members_guard_privileges
BEFORE UPDATE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.guard_family_member_updates();

DROP POLICY IF EXISTS "users manage own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "push_subs: select own"
  ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "push_subs: insert own in family"
  ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_family_member(family_id, auth.uid())
  );

CREATE POLICY "push_subs: update own in family"
  ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_family_member(family_id, auth.uid())
  );

CREATE POLICY "push_subs: delete own"
  ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cleanup_push_subs_on_member_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.push_subscriptions
   WHERE user_id = OLD.user_id
     AND family_id = OLD.family_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS family_members_cleanup_push_subs ON public.family_members;
CREATE TRIGGER family_members_cleanup_push_subs
AFTER DELETE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.cleanup_push_subs_on_member_delete();
