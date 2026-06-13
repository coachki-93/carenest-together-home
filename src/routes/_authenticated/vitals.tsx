import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";

export const Route = createFileRoute("/_authenticated/vitals")({
  head: () => ({ meta: [{ title: "Vitals — CareNest" }] }),
  component: () => {
    const { t } = useTranslation();
    return (
      <DashboardLayout title={t("nav.vitals")} subtitle={t("stub.comingSoon")}>
        <div className="card-soft p-10 text-center max-w-xl mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <Activity className="size-7" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">{t("nav.vitals")}</h2>
          <p className="text-muted-foreground">{t("stub.vitalsBody")}</p>
        </div>
      </DashboardLayout>
    );
  },
});
