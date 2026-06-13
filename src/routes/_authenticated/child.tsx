import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Baby } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";

export const Route = createFileRoute("/_authenticated/child")({
  head: () => ({ meta: [{ title: "Child profile — CareNest" }] }),
  component: () => {
    const { t } = useTranslation();
    return (
      <DashboardLayout title={t("nav.child")} subtitle={t("stub.comingSoon")}>
        <div className="card-soft p-10 text-center max-w-xl mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <Baby className="size-7" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">{t("nav.child")}</h2>
          <p className="text-muted-foreground">{t("stub.childBody")}</p>
        </div>
      </DashboardLayout>
    );
  },
});
