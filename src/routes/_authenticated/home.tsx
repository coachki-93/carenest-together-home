import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyMembership, useSession } from "@/lib/auth/use-profile";
import { useIsAdmin } from "@/lib/auth/use-is-admin";
import { toast } from "@/lib/notify";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — CareNest" }] }),
  component: HomeRouter,
});

function HomeRouter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const profile = useProfile();
  const membership = useMyMembership();
  const isAdmin = useIsAdmin();
  const [processingInvite, setProcessingInvite] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("carenest:pending_invite");
  });


  // Process any pending invite BEFORE routing, so the user is never
  // misclassified as a family owner when they arrived via an invite link.
  useEffect(() => {
    if (!user) return;
    const code =
      typeof window !== "undefined"
        ? localStorage.getItem("carenest:pending_invite")
        : null;
    if (!code) {
      setProcessingInvite(false);
      return;
    }
    (async () => {
      // Force the profile to caregiver so the routing effect can't push
      // them into family onboarding (which would make them an owner).
      await supabase
        .from("profiles")
        .update({ account_type: "caregiver" })
        .eq("id", user.id);

      const { error } = await supabase.rpc("accept_invite", { _code: code });
      localStorage.removeItem("carenest:pending_invite");
      if (error) toast.error(error.message);
      else toast.success(t("home.inviteAccepted"));

      await profile.refetch();
      await membership.refetch();
      setProcessingInvite(false);
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (processingInvite) return;
    // Wait for the session AND the enabled-when-user queries to actually
    // resolve. Without the !user guard, disabled queries report
    // isLoading=false and this effect races: profile.data is undefined,
    // we bounce to /onboarding/child, and HomeRouter unmounts before the
    // admin branch ever gets to run.
    if (sessionLoading || !user) return;
    if (profile.isLoading || membership.isLoading || isAdmin.isLoading) return;
    if (profile.isError || membership.isError) {
      toast.error(t("home.loadFailed"));
      navigate({ to: "/auth/login", replace: true });
      return;
    }
    // Platform admin → dedicated /admin surface. Takes precedence over
    // profile-driven routing: a support-only admin account has
    // account_type='family' and onboarded=false from handle_new_user, so
    // the family branches below would otherwise hijack the redirect.
    // Only defer to family routing when this admin ALSO belongs to a family.
    if (isAdmin.data === true && !membership.data) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    const p = profile.data;
    if (!p) {
      navigate({ to: "/onboarding/child" });
      return;
    }
    if (p.account_type === "caregiver" && !p.onboarded) {
      navigate({ to: "/onboarding/caregiver" });
      return;
    }
    if (p.account_type === "family" && !membership.data) {
      navigate({ to: "/onboarding/child" });
      return;
    }
    if (p.account_type === "family" && membership.data && !p.onboarded) {
      navigate({ to: "/onboarding/child" });
      return;
    }
    navigate({ to: "/dashboard" });
  }, [
    processingInvite,
    sessionLoading,
    user,
    profile.data,
    membership.data,
    profile.isLoading,
    membership.isLoading,
    profile.isError,
    membership.isError,
    isAdmin.data,
    isAdmin.isLoading,
    t,
    navigate,
  ]);


  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}
