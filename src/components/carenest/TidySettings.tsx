import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/notify";
import {
  useTidySettings,
  useUpsertTidySettings,
  useTidyItems,
  useUpsertTidyItem,
  useDeleteTidyItem,
  TIDY_LEAD_OPTIONS,
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
  const upsertSettings = useUpsertTidySettings();
  const upsertItem = useUpsertTidyItem();
  const deleteItem = useDeleteTidyItem();

  const [enabled, setEnabled] = useState(false);
  const [lead, setLead] = useState<number>(30);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setLead(settings.lead_minutes);
    }
  }, [settings]);

  async function saveSettings(nextEnabled: boolean, nextLead: number) {
    if (!familyId) return;
    try {
      await upsertSettings.mutateAsync({
        family_id: familyId,
        enabled: nextEnabled,
        lead_minutes: nextLead,
      });
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

      {/* Enable + lead time */}
      <div className="grid gap-4 sm:grid-cols-2">
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
              void saveSettings(!!v, lead);
            }}
          />
        </div>
        <div className="rounded-xl border p-3 space-y-2">
          <Label className="text-sm font-semibold">{t("tidy.leadLabel")}</Label>
          <Select
            value={String(lead)}
            disabled={!isOwner}
            onValueChange={(v) => {
              const n = Number(v);
              setLead(n);
              void saveSettings(enabled, n);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIDY_LEAD_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("tidy.leadMinutes", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {t("tidy.leadHint")}
          </p>
        </div>
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
