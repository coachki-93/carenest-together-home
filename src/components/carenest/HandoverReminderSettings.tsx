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
  const [lead, setLead] = useState<string>("30");
  const [duration, setDuration] = useState<string>("30");

  useEffect(() => {
    if (family?.handover_reminder_minutes != null) {
      setLead(String(family.handover_reminder_minutes));
    }
    if (family?.handover_reminder_duration_minutes != null) {
      setDuration(String(family.handover_reminder_duration_minutes));
    }
  }, [family?.handover_reminder_minutes, family?.handover_reminder_duration_minutes]);

  async function save() {
    if (!familyId) return;
    const l = Math.round(Number(lead));
    const d = Math.round(Number(duration));
    if (!Number.isFinite(l) || l < 1 || l > 240) {
      toast.error(t("handoverReminder.invalidLead"));
      return;
    }
    if (!Number.isFinite(d) || d < 1 || d > 240) {
      toast.error(t("handoverReminder.invalidDuration"));
      return;
    }
    try {
      await update.mutateAsync({ familyId, leadMinutes: l, durationMinutes: d });
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
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="handover-lead">{t("handoverReminder.leadLabel")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="handover-lead"
                  type="number"
                  min={1}
                  max={240}
                  step={5}
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  {t("handoverReminder.unit")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("handoverReminder.leadHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handover-duration">{t("handoverReminder.durationLabel")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="handover-duration"
                  type="number"
                  min={1}
                  max={240}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  {t("handoverReminder.unit")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("handoverReminder.durationHint")}
              </p>
            </div>
          </div>

          <Button onClick={save} disabled={update.isPending}>
            {t("common.save")}
          </Button>
        </div>
      )}
    </section>
  );
}
