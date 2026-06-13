import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyMembership } from "@/lib/auth/use-profile";
import { Logo } from "@/components/carenest/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — CareNest" }] }),
  component: HomeRouter,
});

/**
 * Step 1 placeholder home. Acts as the post-login router:
 *  - If there's a pending invite in localStorage, accept it.
 *  - Family without onboarding → /onboarding/child
 *  - Caregiver without onboarding → /onboarding/caregiver
 *  - Otherwise → friendly placeholder while Step 2 (dashboard) is being built.
 */
function HomeRouter() {
  const navigate = useNavigate();
  const profile = useProfile();
  const membership = useMyMembership();

  // Accept any pending invite captured during sign-up.
  useEffect(() => {
    const code = typeof window !== "undefined"
      ? localStorage.getItem("carenest:pending_invite")
      : null;
    if (!code) return;
    (async () => {
      const { error } = await supabase.rpc("accept_invite", { _code: code });
      localStorage.removeItem("carenest:pending_invite");
      if (error) toast.error(error.message);
      else toast.success("Invite accepted");
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
        <button
          onClick={signOut}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card-soft p-10 max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-extrabold">You're all set 🎉</h1>
          <p className="text-muted-foreground">
            Hi {profile.data?.full_name?.split(" ")[0] ?? "there"} — your CareNest account is ready.
            The full dashboard, schedule and logs land in Step 2.
          </p>
        </div>
      </main>
    </div>
  );
}
