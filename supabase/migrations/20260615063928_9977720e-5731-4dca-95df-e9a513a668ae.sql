GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_profiles TO authenticated;
GRANT ALL ON public.caregiver_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_shifts TO authenticated;
GRANT ALL ON public.caregiver_shifts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_completions TO authenticated;
GRANT ALL ON public.appointment_completions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.med_logs TO authenticated;
GRANT ALL ON public.med_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.handovers TO authenticated;
GRANT ALL ON public.handovers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;