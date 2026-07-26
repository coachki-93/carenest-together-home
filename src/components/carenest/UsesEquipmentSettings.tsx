import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/notify";
import { useFamily, useUpdateUsesEquipment } from "@/lib/data/family";

interface Props {
  familyId: string | undefined | null;
  isOwner: boolean;
}

export function UsesEquipmentSettings({ familyId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const update = useUpdateUsesEquipment();

  if (!isOwner) return null;

  const value = family?.uses_equipment !== false;

  async function change(next: boolean) {
    if (!familyId || next === value || update.isPending) return;
    try {
      await update.mutateAsync({ familyId, value: next });
      toast.success(t("usesEquipment.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-4">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Wrench className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("usesEquipment.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("usesEquipment.subtitle")}
          </p>
        </div>
      </header>
      <div className="flex items-center justify-between rounded-xl border p-4">
        <Label htmlFor="uses-equipment" className="cursor-pointer">
          {t("usesEquipment.toggle")}
        </Label>
        <Switch
          id="uses-equipment"
          checked={value}
          onCheckedChange={change}
          disabled={update.isPending}
        />
      </div>
    </section>
  );
}
