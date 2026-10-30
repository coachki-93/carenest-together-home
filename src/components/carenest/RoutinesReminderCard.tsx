import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCareNeeds } from "@/lib/care-needs/parse";
import { readScaffoldsMap } from "@/lib/care-needs/scaffold-status";
import { capabilitiesWithTemplates } from "@/lib/care-needs/routine-templates";

/** Dashboard reminder for needs that have routine suggestions but no decision yet. */
export function RoutinesReminderCard({
  childName,
  careNeedsRaw,
}: {
  childName: string;
  careNeedsRaw: unknown;
}) {
  const { t } = useTranslation();
  const pending = useMemo(() => {
    const care = parseCareNeeds(careNeedsRaw);
    const map = readScaffoldsMap(careNeedsRaw);
    const withTemplates = capabilitiesWithTemplates();
    return care.capabilities.filter((c) => withTemplates.has(c) && !map[c]?.routines?.status);
  }, [careNeedsRaw]);

  if (pending.length === 0) return null;
  const needs = pending.map((c) => t(`careNeeds.capabilities.${c}.label`)).join(", ");

  return (
    <article className="card-soft p-5 flex items-start gap-3">
      <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <ListChecks className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold leading-tight">{t("routines.reminderTitle", { name: childName })}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("routines.reminderBody", { needs })}</p>
      </div>
      <Button asChild size="sm" className="rounded-full shrink-0">
        <Link to="/routines" search={{ needs: pending.join(",") }}>
          {t("routines.reminderCta")}
          <ChevronRight className="size-4 ml-1" />
        </Link>
      </Button>
    </article>
  );
}
