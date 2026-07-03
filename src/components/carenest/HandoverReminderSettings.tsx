import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/notify";
import { useFamily, useUpdateHandoverReminderMinutes } from "@/lib/data/family";

interface Props {
  familyId: string | undefined | null;
  isOwner: boolean;
}

export function HandoverReminderSettings({ familyId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const update = useUpdateHandoverReminderMinutes();
  const [minutes, setMinutes] = useState<string>("30");

  useEffect(() => {
    if (family?.handover_reminder_minutes != null) {
      setMinutes(String(family.handover_reminder_minutes));
    }
  }, [family?.handover_reminder_minutes]);

  async function save() {
    if (!familyId) return;
    const n = Math.round(Number(minutes));
    if (!Number.isFinite(n) || n < 5 || n > 120) {
      toast.error(t("handoverReminder.invalid"));
      return;
    }
    try {
      await update.mutateAsync({ familyId, minutes: n });
      toast.success(t("handoverReminder.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-4">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("handoverReminder.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("handoverReminder.subtitle")}
          </p>
        </div>
      </header>

      {!isOwner ? (
        <p className="text-sm text-muted-foreground">
          {t("handoverReminder.ownerOnly")}
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="handover-lead">{t("handoverReminder.label")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="handover-lead"
                type="number"
                min={5}
                max={120}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">
                {t("handoverReminder.unit")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("handoverReminder.hint")}
            </p>
          </div>
          <Button onClick={save} disabled={update.isPending}>
            {t("common.save")}
          </Button>
        </div>
      )}
    </section>
  );
}
