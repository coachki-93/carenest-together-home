import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth/use-profile";
import { Logo } from "@/components/carenest/Logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({ meta: [{ title: "Join family — CareNest" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { session, loading } = useSession();

  const invite = useQuery({
    queryKey: ["invite-lookup", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("lookup_invite", { _code: code });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!session,
  });

  // Stash the code so post-signup we can complete the join.
  useEffect(() => {
    if (code) localStorage.setItem("carenest:pending_invite", code);
  }, [code]);

  if (loading) {
    return (
      <Center>
        <Loader2 className="size-8 animate-spin text-primary" />
      </Center>
    );
  }

  if (!session) {
    return (
      <Center>
        <div className="card-soft p-8 w-full max-w-md space-y-5 text-center">
          <Logo size={48} className="mx-auto" />
          <h1 className="text-2xl font-extrabold">You've been invited</h1>
          <p className="text-muted-foreground text-sm">
            Create your caregiver account to accept this invite.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="rounded-full h-12">
              <Link to="/auth/signup" search={{ invite: code }}>Create caregiver account</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full h-12">
              <Link to="/auth/login">I already have an account</Link>
            </Button>
          </div>
        </div>
      </Center>
    );
  }

  if (invite.isLoading) {
    return <Center><Loader2 className="size-8 animate-spin text-primary" /></Center>;
  }

  if (!invite.data) {
    return (
      <Center>
        <div className="card-soft p-8 w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-extrabold">Invite not found</h1>
          <p className="text-muted-foreground text-sm">
            Double-check the code with the family that invited you.
          </p>
          <Button asChild className="rounded-full h-12 w-full">
            <Link to="/invite">Try another code</Link>
          </Button>
        </div>
      </Center>
    );
  }

  return <AcceptInvite code={code} familyName={invite.data.family_name} status={invite.data.status} />;
}

function AcceptInvite({ code, familyName, status }: { code: string; familyName: string; status: string }) {
  const [accepting, setAccepting] = useState(false);
  const navigate = useNavigate();

  if (status !== "pending") {
    return (
      <Center>
        <div className="card-soft p-8 w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-extrabold">This invite isn't active</h1>
          <p className="text-muted-foreground text-sm">
            Ask the family to send you a new one.
          </p>
          <Button asChild className="rounded-full h-12 w-full">
            <Link to="/home">Go to CareNest</Link>
          </Button>
        </div>
      </Center>
    );
  }

  async function accept() {
    setAccepting(true);
    const { error } = await supabase.rpc("accept_invite", { _code: code });
    setAccepting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    localStorage.removeItem("carenest:pending_invite");
    toast.success(`Welcome to ${familyName}!`);
    navigate({ to: "/onboarding/caregiver" });
  }

  return (
    <Center>
      <div className="card-soft p-8 w-full max-w-md text-center space-y-5">
        <div className="mx-auto rounded-full bg-primary-soft size-16 flex items-center justify-center">
          <Heart className="size-7 text-primary fill-current" />
        </div>
        <h1 className="text-2xl font-extrabold">
          Join <span className="text-primary">{familyName}</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          You'll be added as a caregiver and can help with the daily care schedule.
        </p>
        <Button onClick={accept} disabled={accepting} className="rounded-full h-12 w-full text-base font-semibold">
          {accepting && <Loader2 className="size-4 animate-spin" />}
          {accepting ? "Joining…" : "Accept invite"}
        </Button>
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-6"><Logo size={40} withWordmark /></header>
      <main className="flex-1 flex items-center justify-center px-4">{children}</main>
    </div>
  );
}
