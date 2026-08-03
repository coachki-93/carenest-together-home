import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { BillingCard } from "@/components/carenest/BillingCard";
import { useMyMembership } from "@/lib/auth/use-profile";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Subscription — Tillsa" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { t } = useTranslation();
  const membership = useMyMembership();
  const isOwner = membership.data?.role === "owner";
  const familyId = membership.data?.family_id;

  return (
    <DashboardLayout title={t("nav.billing")}>
      <div className="max-w-2xl mx-auto space-y-4">
        {!familyId ? null : isOwner ? (
          <BillingCard familyId={familyId} isOwner={isOwner} />
        ) : (
          <section className="card-soft p-6 text-sm text-muted-foreground">
            {t("billing.ownerOnly")}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
