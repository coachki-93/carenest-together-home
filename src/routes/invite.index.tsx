import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/carenest/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/")({
  head: () => ({ meta: [{ title: "Join with invite — CareNest" }] }),
  component: InviteEntry,
});

function InviteEntry() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error("Enter the invite code from the family.");
      return;
    }
    navigate({ to: "/invite/$code", params: { code: clean } });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-6">
        <Logo size={40} withWordmark />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card-soft p-8 w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-extrabold">Have an invite?</h1>
            <p className="text-sm text-muted-foreground">
              Enter the code the family shared with you.
            </p>
          </div>
          <form onSubmit={go} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CN-AB12-CD34"
                className="h-14 rounded-xl tracking-widest font-mono text-center text-lg uppercase"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-12 text-base font-semibold">
              Continue
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
