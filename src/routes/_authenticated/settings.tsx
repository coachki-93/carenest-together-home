import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, LogOut, User, Lock, Globe, Palette } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { ImageUpload } from "@/components/carenest/ImageUpload";
import {
  AvatarColorPicker,
  AVATAR_COLORS,
  initials,
} from "@/components/carenest/AvatarColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useMyMembership } from "@/lib/auth/use-profile";
import { I18N_STORAGE_KEY } from "@/lib/i18n";
import { writeLangCookieClient, type Lang } from "@/lib/i18n/cookie";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — CareNest" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const profile = useProfile();
  const membership = useMyMembership();

  const [name, setName] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.full_name ?? "");
      setAvatarPath(profile.data.avatar_url ?? null);
      setColor(profile.data.avatar_color ?? AVATAR_COLORS[0]);
    }
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error(t("settingsPage.nameRequired"));
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          avatar_url: avatarPath,
          avatar_color: color,
        })
        .eq("id", user.id);
      if (error) throw error;
      if (membership.data?.id) {
        await supabase
          .from("family_members")
          .update({ display_color: color })
          .eq("id", membership.data.id);
      }
    },
    onSuccess: () => {
      toast.success(t("settingsPage.profileSaved"));
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-membership"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error(t("auth.use8"));
      if (newPassword !== confirmPassword) throw new Error(t("auth.passwordMismatch"));
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("settingsPage.passwordChanged"));
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function pickLang(code: Lang) {
    writeLangCookieClient(code);
    try {
      window.localStorage.setItem(I18N_STORAGE_KEY, code);
    } catch {
      // ignore
    }
    void i18n.changeLanguage(code);
    toast.success(t("settingsPage.languageUpdated"));
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  const currentLang = i18n.language?.startsWith("sv") ? "sv" : "en";

  return (
    <DashboardLayout
      title={t("nav.settings")}
      subtitle={t("settingsPage.subtitle")}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile */}
        <section className="card-soft p-6 md:p-8 space-y-6">
          <header className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("settingsPage.profileTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settingsPage.profileSub")}
              </p>
            </div>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile.mutate();
            }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center gap-4">
              {user && (
                <ImageUpload
                  userId={user.id}
                  folder="profiles"
                  value={avatarPath}
                  onChange={setAvatarPath}
                  size={96}
                />
              )}
              {!avatarPath && (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="size-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {initials(name || "?")}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">
                {t("common.fullName")}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Palette className="size-4" /> {t("settingsPage.color")}
              </Label>
              <AvatarColorPicker value={color} onChange={setColor} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t("common.email")}</Label>
              <Input
                value={user?.email ?? ""}
                disabled
                className="h-11 rounded-xl bg-muted"
              />
            </div>

            <Button
              type="submit"
              disabled={saveProfile.isPending}
              className="rounded-full"
            >
              {saveProfile.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {saveProfile.isPending
                ? t("common.saving")
                : t("settingsPage.saveProfile")}
            </Button>
          </form>
        </section>

        {/* Language */}
        <section className="card-soft p-6 md:p-8 space-y-4">
          <header className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <Globe className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("common.language")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settingsPage.languageSub")}
              </p>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => pickLang("en")}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                currentLang === "en"
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="text-2xl">🇬🇧</div>
              <div className="font-semibold mt-1">English</div>
            </button>
            <button
              type="button"
              onClick={() => pickLang("sv")}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                currentLang === "sv"
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="text-2xl">🇸🇪</div>
              <div className="font-semibold mt-1">Svenska</div>
            </button>
          </div>
        </section>

        {/* Password */}
        <section className="card-soft p-6 md:p-8 space-y-6">
          <header className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <Lock className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("settingsPage.passwordTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settingsPage.passwordSub")}
              </p>
            </div>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-pw" className="text-sm font-semibold">
                {t("auth.newPassword")}
              </Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl"
                placeholder={t("auth.atLeast8")}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw" className="text-sm font-semibold">
                {t("auth.confirmPassword")}
              </Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={changePassword.isPending || !newPassword}
              className="rounded-full"
            >
              {changePassword.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("auth.updatePassword")}
            </Button>
          </form>
        </section>

        {/* Sign out */}
        <section className="card-soft p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{t("settingsPage.signOutTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settingsPage.signOutSub")}
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={signOut}
            className="rounded-full"
          >
            <LogOut className="size-4" />
            {t("common.signOut")}
          </Button>
        </section>
      </div>
    </DashboardLayout>
  );
}
