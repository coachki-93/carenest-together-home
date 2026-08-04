import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { ReportBugCard } from "@/components/carenest/ReportBugCard";

export const Route = createFileRoute("/_authenticated/report-bug")({
  head: () => ({ meta: [{ title: "Report a bug — Tillsa" }] }),
  component: ReportBugPage,
});

function ReportBugPage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout title={t("nav.reportBug")}>
      <div className="max-w-2xl mx-auto space-y-4">
        <ReportBugCard />
      </div>
    </DashboardLayout>
  );
}
