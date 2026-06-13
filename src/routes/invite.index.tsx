import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/")({
  head: () => ({ meta: [{ title: "Join with invite — CareNest" }] }),
  component: InviteEntry,
});

function InviteEntry() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error(t("invite.invalidCode"));
      return;
    }
    navigate({ to: "/invite/$code", params: { code: clean } });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-6 flex items-center justify-between">
        <Logo size={40} withWordmark />
        <LanguageToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card-soft p-8 w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-extrabold">{t("invite.haveInvite")}</h1>
            <p className="text-sm text-muted-foreground">{t("invite.enterCode")}</p>
          </div>
          <form onSubmit={go} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">{t("invite.code")}</Label>
              <Input
                id="code" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CN-AB12-CD34"
                className="h-14 rounded-xl tracking-widest font-mono text-center text-lg uppercase"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-12 text-base font-semibold">
              {t("common.continue")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
