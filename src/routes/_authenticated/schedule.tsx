import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Schedule — CareNest" }] }),
  component: () => {
    const { t } = useTranslation();
    return (
      <DashboardLayout title={t("nav.schedule")} subtitle={t("stub.comingSoon")}>
        <StubCard icon={<CalendarClock className="size-7" />} title={t("nav.schedule")} body={t("stub.scheduleBody")} />
      </DashboardLayout>
    );
  },
});

function StubCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card-soft p-10 text-center max-w-xl mx-auto">
      <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h2 className="text-2xl font-extrabold mb-2">{title}</h2>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
