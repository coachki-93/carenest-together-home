import { useTranslation } from "react-i18next";
import { BellRing } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/notify";
import { useFamily, useUpdateOwnerNotifyLevel } from "@/lib/data/family";

interface Props {
  familyId: string | undefined | null;
  isOwner: boolean;
}

/**
 * Owner-only radio: "Only when needed" (exceptions) vs "Everything"
 * (all). Caregiver accounts always receive every category and don't see
 * this section.
 */
export function OwnerNotifyLevelSettings({ familyId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const update = useUpdateOwnerNotifyLevel();

  if (!isOwner) return null;

  const level = (family?.owner_notify_level === "all" ? "all" : "exceptions") as
    | "exceptions"
    | "all";

  async function change(next: "exceptions" | "all") {
    if (!familyId || next === level || update.isPending) return;
    try {
      await update.mutateAsync({ familyId, level: next });
      toast.success(t("notifyLevel.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <BellRing className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("notifyLevel.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("notifyLevel.subtitle")}
          </p>
        </div>
      </header>

      <RadioGroup
        value={level}
        onValueChange={(v) => change(v as "exceptions" | "all")}
        className="gap-3"
      >
        <label
          htmlFor="notify-level-exceptions"
          className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer hover:bg-muted/40"
        >
          <RadioGroupItem
            id="notify-level-exceptions"
            value="exceptions"
            className="mt-1"
          />
          <div className="space-y-1">
            <Label
              htmlFor="notify-level-exceptions"
              className="font-semibold cursor-pointer"
            >
              {t("notifyLevel.exceptions.label")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("notifyLevel.exceptions.description")}
            </p>
          </div>
        </label>

        <label
          htmlFor="notify-level-all"
          className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer hover:bg-muted/40"
        >
          <RadioGroupItem id="notify-level-all" value="all" className="mt-1" />
          <div className="space-y-1">
            <Label
              htmlFor="notify-level-all"
              className="font-semibold cursor-pointer"
            >
              {t("notifyLevel.all.label")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("notifyLevel.all.description")}
            </p>
          </div>
        </label>
      </RadioGroup>
    </section>
  );
}
