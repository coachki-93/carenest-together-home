import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { ShoppingListCard } from "@/components/carenest/ShoppingListCard";
import { useMyMembership } from "@/lib/auth/use-profile";

export const Route = createFileRoute("/_authenticated/shopping")({
  component: ShoppingPage,
});

function ShoppingPage() {
  const { t } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;

  return (
    <DashboardLayout
      title={t("shopping.title")}
      subtitle={t("shopping.subtitle")}
      actions={<LanguageToggle />}
    >
      <div className="space-y-4 max-w-3xl">
        {familyId ? (
          <ShoppingListCard familyId={familyId} showEmpty />
        ) : (
          <p className="text-sm text-muted-foreground">{t("shopping.noFamily")}</p>
        )}
      </div>
    </DashboardLayout>
  );
}
