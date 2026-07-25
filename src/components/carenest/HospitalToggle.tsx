import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Hospital } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/notify";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamily, useSetHospitalMode } from "@/lib/data/family";
import { HOSPITAL_CATEGORIES, pausedSelection, type HospitalCategory } from "@/lib/hospital/paused";

export function HospitalToggle() {
  const { t } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const isOwner = membership?.role === "owner";
  const { data: family } = useFamily(familyId);
  const setHospital = useSetHospitalMode();
  const hospitalOn = !!family?.at_hospital_since;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selection, setSelection] = useState<Record<HospitalCategory, boolean>>(
    () => pausedSelection(family ?? null),
  );

  // Refresh selection whenever we open the picker so it always mirrors the
  // stored/legacy value (owner may have toggled it off then reopened).
  useEffect(() => {
    if (pickerOpen) setSelection(pausedSelection(family ?? null));
  }, [pickerOpen, family]);

  if (!familyId) return null;
  // Role rule #8: hospital mode is family config → owner-only in UI.
  // (RLS/RPC gate is is_family_member for now — see N9 follow-up.)
  if (!isOwner) return null;

  const handleSwitch = async (v: boolean) => {
    if (v) {
      setPickerOpen(true);
      return;
    }
    try {
      await setHospital.mutateAsync({ familyId, on: false });
      toast.success(t("dashboard.atHospitalToggleOff"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmPicker = async () => {
    try {
      await setHospital.mutateAsync({ familyId, on: true, paused: selection });
      toast.success(t("dashboard.atHospitalToggleOn"));
      setPickerOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const categoryLabels: Record<HospitalCategory, { title: string; desc: string }> = {
    oxygen: {
      title: t("dashboard.hospitalPause.categories.oxygenTitle"),
      desc: t("dashboard.hospitalPause.categories.oxygenDesc"),
    },
    care_place: {
      title: t("dashboard.hospitalPause.categories.carePlaceTitle"),
      desc: t("dashboard.hospitalPause.categories.carePlaceDesc"),
    },
    tasks: {
      title: t("dashboard.hospitalPause.categories.tasksTitle"),
      desc: t("dashboard.hospitalPause.categories.tasksDesc"),
    },
    handover: {
      title: t("dashboard.hospitalPause.categories.handoverTitle"),
      desc: t("dashboard.hospitalPause.categories.handoverDesc"),
    },
  };

  return (
    <>
      <label
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold cursor-pointer transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          hospitalOn
            ? "border-red-400 bg-red-50 text-red-900"
            : "border-input bg-background hover:bg-muted",
        )}
        title={t("dashboard.atHospital")}
      >
        <Hospital className="size-4" />
        <span className="hidden sm:inline">{t("dashboard.atHospital")}</span>
        <Switch
          checked={hospitalOn}
          disabled={setHospital.isPending}
          onCheckedChange={handleSwitch}
        />
      </label>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hospital className="size-5 text-red-600" />
              {t("dashboard.hospitalPause.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("dashboard.hospitalPause.dialogDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {HOSPITAL_CATEGORIES.map((cat) => {
              const { title, desc } = categoryLabels[cat];
              const checked = selection[cat];
              return (
                <label
                  key={cat}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                    checked
                      ? "border-red-300 bg-red-50/60"
                      : "border-input bg-background hover:bg-muted",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setSelection((prev) => ({ ...prev, [cat]: v === true }))
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{title}</div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPickerOpen(false)}
              disabled={setHospital.isPending}
            >
              {t("dashboard.hospitalPause.cancel")}
            </Button>
            <Button
              onClick={confirmPicker}
              disabled={setHospital.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("dashboard.hospitalPause.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
