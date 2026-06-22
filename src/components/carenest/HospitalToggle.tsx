import { useTranslation } from "react-i18next";
import { Hospital } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/notify";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamily, useSetHospitalMode } from "@/lib/data/family";

export function HospitalToggle() {
  const { t } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const { data: family } = useFamily(familyId);
  const setHospital = useSetHospitalMode();
  const hospitalOn = !!family?.at_hospital_since;

  if (!familyId) return null;

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold cursor-pointer transition-colors",
        hospitalOn
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-input bg-background hover:bg-muted",
      )}
      title={t("dashboard.atHospital")}
    >
      <Hospital className="size-4" />
      <span className="hidden sm:inline">{t("dashboard.atHospital")}</span>
      <Switch
        checked={hospitalOn}
        disabled={setHospital.isPending}
        onCheckedChange={async (v) => {
          try {
            await setHospital.mutateAsync({ familyId, on: v });
            toast.success(
              v ? t("dashboard.atHospitalToggleOn") : t("dashboard.atHospitalToggleOff"),
            );
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </label>
  );
}
