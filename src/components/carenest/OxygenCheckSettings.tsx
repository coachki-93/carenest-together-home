import { useTranslation } from "react-i18next";
import { Wind } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/notify";
import { useFamily, useUpdateOxygenCheckInterval } from "@/lib/data/family";

interface Props {
  familyId: string | undefined | null;
  isOwner: boolean;
}

/** All options are >= 30 min, so the DB CHECK can never be violated. */
const HOUR_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

export function OxygenCheckSettings({ familyId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const update = useUpdateOxygenCheckInterval();

  if (!isOwner) return null;

  const minutes = family?.oxygen_check_interval_minutes ?? 180;
  const hours = Math.max(1, Math.round(minutes / 60));

  async function change(next: string) {
    const nextHours = Number(next);
    if (!familyId || !Number.isFinite(nextHours) || nextHours === hours || update.isPending) return;
    try {
      await update.mutateAsync({ familyId, minutes: nextHours * 60 });
      toast.success(t("oxygenCheck.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-4">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Wind className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("oxygenCheck.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("oxygenCheck.subtitle")}</p>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <Label htmlFor="oxygen-check-interval" className="text-sm">
          {t("oxygenCheck.label")}
        </Label>
        <Select value={String(hours)} onValueChange={change} disabled={update.isPending}>
          <SelectTrigger id="oxygen-check-interval" className="h-11 rounded-xl w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOUR_OPTIONS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {t("oxygenCheck.hours", { count: h })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
