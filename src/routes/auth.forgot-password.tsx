import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — CareNest" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) {
      toast.error("Enter a valid email");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card-soft p-8 text-center space-y-5">
        <div className="mx-auto rounded-full bg-primary-soft size-14 flex items-center justify-center">
          <Mail className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          If an account exists for <span className="font-semibold text-foreground">{email}</span>,
          we sent a reset link.
        </p>
        <Button asChild className="rounded-full w-full h-12">
          <Link to="/auth/login">Back to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="card-soft p-8 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          We'll send a link to reset it.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="h-12 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={sending} className="w-full rounded-full h-12 text-base font-semibold">
          {sending && <Loader2 className="size-4 animate-spin" />}
          {sending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
