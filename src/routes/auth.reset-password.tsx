import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — CareNest" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/home" });
  }

  return (
    <div className="card-soft p-8 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose something you'll remember.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password" type="password" required autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl" placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm" type="password" required autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full rounded-full h-12 text-base font-semibold">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
