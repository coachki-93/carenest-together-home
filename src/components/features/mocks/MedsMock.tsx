import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * MedsMock — dose history hero mirror (deck MEDS idiom, larger).
 * Bilingual via useTranslation. Generic medications only (no brand names).
 * Cast: Kim, Gabriella.
 */

const chipGiven =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "bg-[color-mix(in_oklab,var(--color-marketing-sage)_22%,var(--color-marketing-bg))] " +
  "text-[color:var(--color-marketing-sage)]";

const chipSkipped =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "border border-marketing-line text-marketing-muted bg-marketing-surface";

const chipPendingCls =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "border border-marketing-line text-marketing-muted";

const row =
  "flex items-baseline gap-3 py-2.5 px-3 rounded-xl border border-marketing-line bg-marketing-bg";

export function MedsMock() {
  const { i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");

  const s = sv
    ? {
        header: "Adams mediciner · idag",
        progress: "3 av 4 klara",
        m1: "D-vitamindroppar",
        m1by: "Given av Kim · 08:04",
        given: "Given",
        m2: "Inhalation · 2 puffar",
        m2by: "Given av Gabriella · 10:02",
        m3: "Paracetamol · 250 mg",
        m3note: "Skippad — huvudvärk borta",
        skipped: "Skippad",
        m4: "Paracetamol · 250 mg",
        m4note: "På tur",
        pending: "På tur",
      }
    : {
        header: "Adam's meds · today",
        progress: "3 of 4 done",
        m1: "Vitamin D drops",
        m1by: "Given by Kim · 08:04",
        given: "Given",
        m2: "Inhalation · 2 puffs",
        m2by: "Given by Gabriella · 10:02",
        m3: "Paracetamol · 250 mg",
        m3note: "Skipped — headache gone",
        skipped: "Skipped",
        m4: "Paracetamol · 250 mg",
        m4note: "Up next",
        pending: "Up next",
      };

  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
          {s.header}
        </p>
        <p className="text-[11px] text-marketing-muted">{s.progress}</p>
      </div>

      <ul className="space-y-2">
        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">08:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">{s.m1}</span>
            <span className="block text-[11px] text-marketing-muted">{s.m1by}</span>
          </span>
          <span className={chipGiven}>
            <Check className="size-3 inline -mt-0.5 mr-0.5" />
            {s.given}
          </span>
        </li>

        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">10:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">{s.m2}</span>
            <span className="block text-[11px] text-marketing-muted">{s.m2by}</span>
          </span>
          <span className={chipGiven}>
            <Check className="size-3 inline -mt-0.5 mr-0.5" />
            {s.given}
          </span>
        </li>

        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">14:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">{s.m3}</span>
            <span className="block text-[11px] text-marketing-muted">{s.m3note}</span>
          </span>
          <span className={chipSkipped}>{s.skipped}</span>
        </li>

        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">18:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">{s.m4}</span>
            <span className="block text-[11px] text-marketing-muted">{s.m4note}</span>
          </span>
          <span className={chipPendingCls}>{s.pending}</span>
        </li>
      </ul>
    </div>
  );
}
