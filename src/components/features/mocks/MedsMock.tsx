import { Check } from "lucide-react";

/**
 * MedsMock — dose history hero mirror (deck MEDS idiom, larger).
 * Generic medications only (binding rule — no brand names).
 * Cast: Kim, Gabriella.
 */

const chipGiven =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "bg-[color-mix(in_oklab,var(--color-marketing-sage)_22%,var(--color-marketing-bg))] " +
  "text-[color:var(--color-marketing-sage)]";

const chipSkipped =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "border border-marketing-line text-marketing-muted bg-marketing-surface";

const chipPending =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "border border-marketing-line text-marketing-muted";

const row =
  "flex items-baseline gap-3 py-2.5 px-3 rounded-xl border border-marketing-line bg-marketing-bg";

export function MedsMock() {
  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
          Adams mediciner · idag
        </p>
        <p className="text-[11px] text-marketing-muted">3 av 4 klara</p>
      </div>

      <ul className="space-y-2">
        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">08:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">
              D-vitamindroppar
            </span>
            <span className="block text-[11px] text-marketing-muted">
              Given av Kim · 08:04
            </span>
          </span>
          <span className={chipGiven}>
            <Check className="size-3 inline -mt-0.5 mr-0.5" />
            Given
          </span>
        </li>

        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">10:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">
              Inhalation · 2 puffar
            </span>
            <span className="block text-[11px] text-marketing-muted">
              Given av Gabriella · 10:02
            </span>
          </span>
          <span className={chipGiven}>
            <Check className="size-3 inline -mt-0.5 mr-0.5" />
            Given
          </span>
        </li>

        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">14:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">
              Paracetamol · 250 mg
            </span>
            <span className="block text-[11px] text-marketing-muted">
              Skippad — huvudvärk borta
            </span>
          </span>
          <span className={chipSkipped}>Skippad</span>
        </li>

        <li className={row}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">18:00</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-marketing-ink font-semibold">
              Paracetamol · 250 mg
            </span>
            <span className="block text-[11px] text-marketing-muted">På tur</span>
          </span>
          <span className={chipPending}>På tur</span>
        </li>
      </ul>
    </div>
  );
}
