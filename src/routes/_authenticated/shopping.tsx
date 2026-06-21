import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
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
    <DashboardLayout>
      <div className="space-y-4 max-w-3xl mx-auto">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <ShoppingCart className="size-6" />
              {t("shopping.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("shopping.subtitle")}</p>
          </div>
          <LanguageToggle />
        </header>

        {familyId ? (
          <ShoppingListCard familyId={familyId} showEmpty />
        ) : (
          <p className="text-sm text-muted-foreground">{t("shopping.noFamily")}</p>
        )}
      </div>
    </DashboardLayout>
  );
}
