import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyMembership } from "@/lib/auth/use-profile";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — CareNest" }] }),
  component: HomeRouter,
});

function HomeRouter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const membership = useMyMembership();

  useEffect(() => {
    const code = typeof window !== "undefined"
      ? localStorage.getItem("carenest:pending_invite")
      : null;
    if (!code) return;
    (async () => {
      const { error } = await supabase.rpc("accept_invite", { _code: code });
      localStorage.removeItem("carenest:pending_invite");
      if (error) toast.error(error.message);
      else toast.success(t("home.inviteAccepted"));
      profile.refetch();
      membership.refetch();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
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
    }
  }, [profile.data, membership.data, profile.isLoading, membership.isLoading, navigate]);

  if (profile.isLoading || membership.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-6 flex items-center justify-between">
        <Logo size={40} withWordmark />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button
            onClick={signOut}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("common.signOut")}
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card-soft p-10 max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-extrabold">{t("home.allSet")}</h1>
          <p className="text-muted-foreground">
            {t("home.body", { name: profile.data?.full_name?.split(" ")[0] ?? t("home.there") })}
          </p>
        </div>
      </main>
    </div>
  );
}
