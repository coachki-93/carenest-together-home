import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import { Kicker } from "@/components/marketing/Kicker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

const KEYS = ["q1", "q2", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];

/**
 * Marketing FAQ — shared by the landing page (§12) and /support so the two
 * surfaces can't drift. `id` is a prop so each host owns its own anchor.
 */
export function FaqSection({ id = "faq" }: { id?: string }) {
  const { t } = useTranslation();
  return (
    <section id={id} className="px-6 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <Reveal className="text-center mb-12 space-y-3">
          <Kicker>{t("marketing.faq.kicker")}</Kicker>
          <h2 className="text-display-md text-marketing-ink" style={display}>
            {t("marketing.faq.title")}
          </h2>
        </Reveal>
        <Accordion
          type="single"
          collapsible
          defaultValue="q1"
          className="mk-glass rounded-3xl px-5 md:px-7 divide-y divide-marketing-line/60"
        >
          {KEYS.map((k) => (
            <AccordionItem key={k} value={k} className="border-0">
              <AccordionTrigger
                className="text-left text-lg py-5 hover:no-underline [&[data-state=open]>svg]:hidden text-marketing-ink"
                style={display}
              >
                <span className="flex-1 pr-4">{t(`marketing.faq.${k}Q`)}</span>
                <span className="text-marketing-sage shrink-0">
                  <Plus className="size-5 transition-transform [[data-state=open]_&]:rotate-45" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-marketing-muted text-base md:text-lg leading-[1.7]">
                {t(`marketing.faq.${k}A`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
