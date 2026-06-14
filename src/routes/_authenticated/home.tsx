import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyMembership, useSession } from "@/lib/auth/use-profile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — CareNest" }] }),
  component: HomeRouter,
});

function HomeRouter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const profile = useProfile();
  const membership = useMyMembership();
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
    if (profile.isLoading || membership.isLoading) return;
    const p = profile.data;
    if (!p) return;
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
    profile.data,
    membership.data,
    profile.isLoading,
    membership.isLoading,
    navigate,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}
