import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/notify";
import { clearAllScaffolds, readScaffoldsMap } from "@/lib/care-needs/scaffold-status";

interface Props {
  familyId: string | undefined | null;
}

export function ScaffoldsResetSettings({ familyId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: child } = useQuery({
    queryKey: ["dashboard-child", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, care_needs")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const anyState =
    child ? Object.keys(readScaffoldsMap(child.care_needs)).length > 0 : false;

  const reset = useMutation({
    mutationFn: async () => {
      if (!child) return;
      const merged = clearAllScaffolds(child.care_needs);
      const { error } = await supabase
        .from("children")
        .update({ care_needs: merged as never })
        .eq("id", child.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-child", familyId] });
      qc.invalidateQueries({ queryKey: ["children", familyId] });
      toast.success(t("scaffolds.resetDone"));
    },
    onError: (e: Error) => toast.error(e.message),
    meta: { suppressGlobalError: true },
  });

  return (
    <section className="card-soft p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{t("scaffolds.resetTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("scaffolds.resetBody")}</p>
        </div>
      </header>
      <Button
        variant="secondary"
        className="rounded-full"
        disabled={!child || !anyState || reset.isPending}
        onClick={() => reset.mutate()}
      >
        <RotateCcw className="size-4 mr-2" />
        {t("scaffolds.resetBtn")}
      </Button>
    </section>
  );
}
