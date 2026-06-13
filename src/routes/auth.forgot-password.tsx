import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { useTranslation, Trans } from "react-i18next";
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
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) {
      toast.error(t("auth.invalidEmail"));
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
        <h1 className="text-2xl font-bold">{t("auth.checkEmail")}</h1>
        <p className="text-muted-foreground text-sm">
          <Trans
            i18nKey="auth.checkEmailBody"
            values={{ email }}
            components={{ 1: <span className="font-semibold text-foreground" /> }}
          />
        </p>
        <Button asChild className="rounded-full w-full h-12">
          <Link to="/auth/login">{t("auth.backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="card-soft p-8 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold">{t("auth.forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.forgotSub")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input
            id="email" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="h-12 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={sending} className="w-full rounded-full h-12 text-base font-semibold">
          {sending && <Loader2 className="size-4 animate-spin" />}
          {sending ? t("auth.sending") : t("auth.sendReset")}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
