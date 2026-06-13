import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useMyMembership } from "@/lib/auth/use-profile";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { ImageUpload } from "@/components/carenest/ImageUpload";
import { AvatarColorPicker, AVATAR_COLORS, initials } from "@/components/carenest/AvatarColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding/caregiver")({
  head: () => ({ meta: [{ title: "Set up your caregiver profile — CareNest" }] }),
  component: CaregiverOnboarding,
});

function CaregiverOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const profile = useProfile();
  const membership = useMyMembership();

  const [name, setName] = useState(profile.data?.full_name ?? "");
  const [avatarPath, setAvatarPath] = useState<string | null>(profile.data?.avatar_url ?? null);
  const [color, setColor] = useState<string>(profile.data?.avatar_color ?? AVATAR_COLORS[0]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error(t("onboardingCaregiver.namePh"));
      const { error } = await supabase.from("profiles").update({
        full_name: name.trim(),
        avatar_url: avatarPath,
        avatar_color: color,
        onboarded: true,
      }).eq("id", user.id);
      if (error) throw error;

      if (membership.data?.id) {
        await supabase.from("family_members")
          .update({ display_color: color })
          .eq("id", membership.data.id);
      }
    },
    onSuccess: () => {
      toast.success(t("onboardingCaregiver.saved"));
      navigate({ to: "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Logo size={40} withWordmark />
          <LanguageToggle />
        </header>
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold">{t("onboardingCaregiver.title")}</h1>
          <p className="text-muted-foreground">
            {membership.data?.families?.name
              ? t("onboardingCaregiver.subJoined", { family: membership.data.families.name })
              : t("onboardingCaregiver.sub")}
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="card-soft p-8 space-y-7"
        >
          <div className="flex flex-col items-center gap-5">
            {user && (
              <ImageUpload
                userId={user.id}
                folder="profiles"
                value={avatarPath}
                onChange={setAvatarPath}
                size={112}
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
                <p className="text-xs text-muted-foreground">{t("onboardingCaregiver.pickColor")}</p>
                <AvatarColorPicker value={color} onChange={setColor} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-semibold">{t("common.fullName")}</Label>
            <Input
              id="name" value={name} onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl" placeholder={t("onboardingCaregiver.namePh")}
              required
            />
          </div>

          <Button type="submit" disabled={save.isPending}
            className="w-full rounded-full h-12 text-base font-semibold">
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {save.isPending ? t("common.saving") : t("onboardingCaregiver.finish")}
          </Button>
        </form>
      </div>
    </div>
  );
}
