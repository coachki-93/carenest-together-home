import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/notify";
import { Logo } from "@/components/carenest/Logo";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — CareNest" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("auth.use8"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.updatePassword"));
    navigate({ to: "/home" });
  }

  return (
    <div className="card-soft p-8 space-y-6">
      <div className="flex justify-center">
        <Logo size={120} />
      </div>
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold">{t("auth.setNewPassword")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.setNewPasswordSub")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <Input
            id="password" type="password" required autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl" placeholder={t("auth.atLeast8")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input
            id="confirm" type="password" required autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full rounded-full h-12 text-base font-semibold">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? t("auth.updating") : t("auth.updatePassword")}
        </Button>
      </form>
    </div>
  );
}
