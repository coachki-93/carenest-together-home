import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/notify";
import {
  useTidySettings,
  useUpsertTidySettings,
  useTidyItems,
  useUpsertTidyItem,
  useDeleteTidyItem,
  useTidyTimes,
  useUpsertTidyTime,
  useDeleteTidyTime,
} from "@/lib/data/tidy";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
  isOwner: boolean;
}

export function TidySettings({ familyId, userId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: settings } = useTidySettings(familyId);
  const { data: items = [] } = useTidyItems(familyId);
  const { data: times = [] } = useTidyTimes(familyId);
  const upsertSettings = useUpsertTidySettings();
  const upsertItem = useUpsertTidyItem();
  const deleteItem = useDeleteTidyItem();
  const upsertTime = useUpsertTidyTime();
  const deleteTime = useDeleteTidyTime();

  const [enabled, setEnabled] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("22:00");
  const [newTimeLabel, setNewTimeLabel] = useState("");
  const [newGrace, setNewGrace] = useState("30");

  useEffect(() => {
    if (settings) setEnabled(settings.enabled);
  }, [settings]);

  async function saveEnabled(next: boolean) {
    if (!familyId) return;
    try {
      await upsertSettings.mutateAsync({ family_id: familyId, enabled: next });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function addItem() {
    if (!familyId || !userId || !newLabel.trim()) return;
    try {
      await upsertItem.mutateAsync({
        family_id: familyId,
        created_by: userId,
        label: newLabel.trim(),
        position: items.length,
        active: true,
      });
      setNewLabel("");
      toast.success(t("tidy.itemAdded"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function addTime() {
    if (!familyId || !userId || !newTime) return;
    try {
      await upsertTime.mutateAsync({
        family_id: familyId,
        created_by: userId,
        time_of_day: `${newTime}:00`,
        label: newTimeLabel.trim() || null,
        grace_minutes: Math.max(0, Math.min(720, Number(newGrace) || 30)),
        active: true,
      });
      setNewTimeLabel("");
      setNewGrace("30");
      toast.success(t("tidy.timeAdded"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("tidy.settingsTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("tidy.settingsSub")}
          </p>
        </div>
      </header>

      {!isOwner && (
        <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
          {t("tidy.ownerOnly")}
        </p>
      )}

      {/* Enable */}
      <div className="flex items-center justify-between rounded-xl border p-3">
        <div>
          <Label className="text-sm font-semibold">{t("tidy.enableLabel")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("tidy.enableHint")}
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={!isOwner}
          onCheckedChange={(v) => {
            setEnabled(!!v);
            void saveEnabled(!!v);
          }}
        />
      </div>

      {/* Times */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="size-4" />
          {t("tidy.timesTitle")}
        </h3>
        <div className="space-y-2">
          {times.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("tidy.noTimes")}
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
                  {t("tidy.graceShort", { n: tm.grace_minutes ?? 30 })}
                </div>
              </div>
              {isOwner && (
                <>
                  <Input
                    type="number"
                    min={0}
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
                          0,
                          Math.min(720, Number(e.target.value) || 0),
                        ),
                      })
                    }
                    className="w-20 h-9"
                    aria-label={t("tidy.grace")}
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
                    aria-label={t("tidy.toggleActive")}
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
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-32"
              />
              <Input
                placeholder={t("tidy.timeLabelPlaceholder")}
                value={newTimeLabel}
                onChange={(e) => setNewTimeLabel(e.target.value)}
                className="flex-1 min-w-[160px]"
              />
              <Input
                type="number"
                min={0}
                max={720}
                value={newGrace}
                onChange={(e) => setNewGrace(e.target.value)}
                className="w-20"
                aria-label={t("tidy.grace")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("tidy.graceHint")}
            </p>
            <Button
              type="button"
              onClick={addTime}
              disabled={upsertTime.isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              {t("tidy.addTime")}
            </Button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">{t("tidy.itemsTitle")}</h3>
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("tidy.noItems")}
            </p>
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-2 rounded-xl border p-3"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate">{it.label}</span>
              </div>
              {isOwner && (
                <>
                  <Switch
                    checked={it.active}
                    onCheckedChange={(v) =>
                      upsertItem.mutate({
                        id: it.id,
                        family_id: it.family_id,
                        created_by: it.created_by,
                        label: it.label,
                        position: it.position,
                        active: !!v,
                      })
                    }
                    aria-label={t("tidy.toggleActive")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteItem.mutate(it.id)}
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
            <Input
              placeholder={t("tidy.itemPlaceholder")}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addItem();
                }
              }}
            />
            <Button
              type="button"
              onClick={addItem}
              disabled={!newLabel.trim() || upsertItem.isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              {t("tidy.addItem")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
