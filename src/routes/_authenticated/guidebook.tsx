import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import {
  GuidebookBlocks,
  type GuidebookBlock,
} from "@/components/carenest/GuidebookSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/guidebook")({
  head: () => ({ meta: [{ title: "Guidebook — Tillsa" }] }),
  component: GuidebookPage,
});

const GROUPS: { group: "care" | "caregivers" | "family" | "account"; keys: string[] }[] = [
  {
    group: "care",
    keys: [
      "dashboard",
      "schedule",
      "appointments",
      "medications",
      "vitals",
      "events",
      "oxygen",
      "handover",
      "instructions",
      "inventory",
      "maintenance",
      "shopping",
      "emergency",
    ],
  },
  { group: "caregivers", keys: ["caregivers", "shifts"] },
  { group: "family", keys: ["child"] },
  { group: "account", keys: ["billing", "settings"] },
];

function GuidebookPage() {
  const { t } = useTranslation();

  const intro = t("guidebook.intro", { returnObjects: true }) as {
    heading: string;
    body: string[];
    stepsHeading: string;
    steps: string[];
  };

  return (
    <DashboardLayout title={t("guidebook.title")} subtitle={t("guidebook.subtitle")}>
      <div className="max-w-3xl mx-auto space-y-6">
        <section className="card-soft p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-extrabold tracking-tight">{intro.heading}</h2>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {intro.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold">{intro.stepsHeading}</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {intro.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </section>

        {GROUPS.map(({ group, keys }) => (
          <section key={group} className="card-soft p-2 md:p-4">
            <h2 className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t(`guidebook.groups.${group}`)}
            </h2>
            <Accordion type="multiple" className="w-full">
              {keys.map((key) => (
                <AccordionItem key={key} value={key} className="last:border-b-0">
                  <AccordionTrigger className="px-3 text-left font-semibold">
                    {t(`guidebook.sections.${key}.title`)}
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-5">
                    <GuidebookBlocks
                      blocks={
                        t(`guidebook.sections.${key}.blocks`, {
                          returnObjects: true,
                        }) as GuidebookBlock[]
                      }
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
