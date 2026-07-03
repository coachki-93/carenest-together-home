import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/notify";
import {
  useHandoverTimes,
  useUpsertHandoverTime,
  useDeleteHandoverTime,
} from "@/lib/data/handover-times";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
  isOwner: boolean;
}

export function HandoverReminderSettings({ familyId, userId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: times = [] } = useHandoverTimes(familyId);
  const upsertTime = useUpsertHandoverTime();
  const deleteTime = useDeleteHandoverTime();

  const [newTime, setNewTime] = useState("21:30");
  const [newLabel, setNewLabel] = useState("");
  const [newGrace, setNewGrace] = useState("30");

  async function addTime() {
    if (!familyId || !userId || !newTime) return;
    try {
      await upsertTime.mutateAsync({
        family_id: familyId,
        created_by: userId,
        time_of_day: `${newTime}:00`,
        label: newLabel.trim() || null,
        grace_minutes: Math.max(1, Math.min(720, Number(newGrace) || 30)),
        active: true,
      });
      setNewLabel("");
      setNewGrace("30");
      toast.success(t("handoverReminder.timeAdded"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-6">
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

      {!isOwner && (
        <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
          {t("handoverReminder.ownerOnly")}
        </p>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="size-4" />
          {t("handoverReminder.timesTitle")}
        </h3>
        <div className="space-y-2">
          {times.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("handoverReminder.noTimes")}
            </p>
          )}
          {times.map((tm) => (
            <div
              key={tm.id}
              className="flex items-center gap-2 rounded-xl border p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold">
                  {tm.time_of_day.slice(0, 5)}
                </div>
                {tm.label && (
                  <div className="text-xs text-muted-foreground">
                    {tm.label}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  {t("handoverReminder.graceShort", {
                    n: tm.grace_minutes ?? 30,
                  })}
                </div>
              </div>
              {isOwner && (
                <>
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={tm.grace_minutes ?? 30}
                    onChange={(e) =>
                      upsertTime.mutate({
                        id: tm.id,
                        family_id: tm.family_id,
                        created_by: tm.created_by,
                        time_of_day: tm.time_of_day,
                        label: tm.label,
                        active: tm.active,
                        grace_minutes: Math.max(
                          1,
                          Math.min(720, Number(e.target.value) || 1),
                        ),
                      })
                    }
                    className="w-20 h-9"
                    aria-label={t("handoverReminder.grace")}
                  />
                  <Switch
                    checked={tm.active}
                    onCheckedChange={(v) =>
                      upsertTime.mutate({
                        id: tm.id,
                        family_id: tm.family_id,
                        created_by: tm.created_by,
                        time_of_day: tm.time_of_day,
                        label: tm.label,
                        grace_minutes: tm.grace_minutes,
                        active: !!v,
                      })
                    }
                    aria-label={t("handoverReminder.toggleActive")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTime.mutate(tm.id)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="rounded-xl border-dashed border-2 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {t("handoverReminder.timeLabel")}
                </Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {t("handoverReminder.labelLabel")}
                </Label>
                <Input
                  placeholder={t("handoverReminder.labelPlaceholder")}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {t("handoverReminder.grace")}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={newGrace}
                  onChange={(e) => setNewGrace(e.target.value)}
                  className="w-20"
                  aria-label={t("handoverReminder.grace")}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("handoverReminder.graceHint")}
            </p>
            <Button
              type="button"
              onClick={addTime}
              disabled={upsertTime.isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              {t("handoverReminder.addTime")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
