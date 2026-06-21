import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/notify";
import { Logo } from "@/components/carenest/Logo";

const searchSchema = z.object({
  invite: z.string().optional(),
});

export const Route = createFileRoute("/auth/signup")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign up — CareNest" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = useTranslation();
  const { invite } = useSearch({ from: "/auth/signup" });
  const navigate = useNavigate();
  const isCaregiver = !!invite;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (invite) localStorage.setItem("carenest:pending_invite", invite);
  }, [invite]);

  const formSchema = z
    .object({
      fullName: z.string().trim().min(1, t("auth.nameRequired")).max(80),
      email: z.string().trim().email(t("auth.invalidEmail")),
      password: z.string().min(8, t("auth.use8")).max(72),
      confirm: z.string(),
      agree: z.boolean(),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("auth.passwordMismatch") })
    .refine((v) => v.agree, { path: ["agree"], message: t("auth.pleaseAgree") });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = formSchema.safeParse({ fullName, email, password, confirm, agree });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
        data: {
          full_name: parsed.data.fullName,
          account_type: isCaregiver ? "caregiver" : "family",
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSentTo(parsed.data.email);
  }

  async function oauth(provider: "google" | "apple") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth/login",
    });
    if (result.error) {
      toast.error(t("auth.oauthFailed"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  if (sentTo) {
    return (
      <div className="card-soft p-8 text-center space-y-5">
        <div className="mx-auto rounded-full bg-primary-soft size-14 flex items-center justify-center">
          <Mail className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t("auth.checkInbox")}</h1>
        <p className="text-muted-foreground text-sm">
          <Trans
            i18nKey="auth.checkInboxBody"
            values={{ email: sentTo }}
            components={{ 1: <span className="font-semibold text-foreground" /> }}
          />
        </p>
        <Button asChild className="rounded-full w-full h-12">
          <Link to="/auth/login">{t("auth.continueLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="card-soft p-8 space-y-6">
      <div className="flex justify-center">
        <Logo size={120} />
      </div>
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold">
          {isCaregiver ? t("auth.signupTitleCaregiver") : t("auth.signupTitleFamily")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isCaregiver ? t("auth.signupSubCaregiver") : t("auth.signupSubFamily")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="rounded-full h-11" onClick={() => oauth("google")}>
          <GoogleIcon /> {t("common.google")}
        </Button>
        <Button type="button" variant="outline" className="rounded-full h-11" onClick={() => oauth("apple")}>
          <AppleIcon /> {t("common.apple")}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-card px-3 text-muted-foreground">{t("common.orWithEmail")}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">{t("common.firstName")}</Label>
          <Input
            id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Sam" className="h-12 rounded-xl" autoComplete="given-name" required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="h-12 rounded-xl" autoComplete="email" required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("common.password")}</Label>
          <Input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.atLeast8")} className="h-12 rounded-xl" autoComplete="new-password" required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input
            id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="h-12 rounded-xl" autoComplete="new-password" required
          />
        </div>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
          <span className="text-muted-foreground">{t("auth.agreeTerms")}</span>
        </label>
        <Button type="submit" disabled={submitting} className="w-full rounded-full h-12 text-base font-semibold">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? t("auth.creatingAccount") : t("auth.create")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.alreadyAccount")}{" "}
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.16a5.27 5.27 0 0 1-2.29 3.46v2.87h3.7c2.16-2 3.43-4.93 3.43-8.57Z" />
      <path fill="#34A853" d="M12 23c3.1 0 5.7-1.03 7.57-2.79l-3.7-2.87c-1.03.69-2.34 1.1-3.87 1.1-2.97 0-5.49-2-6.39-4.7H1.79v2.95A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.61 13.74A6.6 6.6 0 0 1 5.27 12c0-.6.1-1.18.34-1.74V7.31H1.79A11 11 0 0 0 1 12c0 1.77.43 3.45 1.79 4.69l3.82-2.95Z" />
      <path fill="#EA4335" d="M12 5.38c1.68 0 3.18.58 4.36 1.7l3.27-3.27C17.7 1.98 15.1 1 12 1A11 11 0 0 0 1.79 7.31l3.82 2.95C6.51 7.38 9.03 5.38 12 5.38Z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.81c.02 2.6 2.27 3.47 2.3 3.49-.02.06-.36 1.24-1.18 2.46-.71 1.06-1.45 2.12-2.62 2.14-1.15.02-1.52-.68-2.83-.68-1.31 0-1.72.66-2.81.7-1.13.04-1.99-1.15-2.71-2.21-1.47-2.13-2.6-6.02-1.09-8.65a4.18 4.18 0 0 1 3.54-2.16c1.12-.02 2.18.76 2.86.76.68 0 1.97-.94 3.32-.8.57.02 2.16.23 3.18 1.73-.08.05-1.9 1.12-1.96 3.22ZM14.27 5.1c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.55 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.97-.5 2.57-1.24Z" />
    </svg>
  );
}
