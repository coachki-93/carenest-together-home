import { CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * HandoversMock — bilingual glass sheet mirroring the auto-filled handover
 * on /handover. Every string here matches the exact emission format from
 * src/lib/data/handover-prefill.ts (verified post-fix — tank labels via
 * TANKS[type].label and flow via formatFlow(); vital type via i18n).
 */
export function HandoversMock() {
  const { t } = useTranslation();
  const K = "featuresV2.handovers.mock";

  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
      {/* Sheet header */}
      <div className="flex items-baseline justify-between mb-4">
        <p
          className="text-sm font-bold text-marketing-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t(`${K}.title`)}
        </p>
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
          {t("featuresV2.handovers.kicker")}
        </span>
      </div>

      {/* Meds column */}
      <div className="rounded-2xl bg-marketing-surface border border-marketing-line p-4 mb-3">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-2">
          {t(`${K}.medsHeader`)}
        </p>
        <ul className="space-y-1.5">
          <li className="text-[12.5px] text-marketing-ink font-mono leading-relaxed">
            {t(`${K}.l1`)}
          </li>
          <li className="text-[12.5px] text-marketing-ink font-mono leading-relaxed">
            {t(`${K}.l2`)}
          </li>
          <li className="text-[12.5px] text-marketing-muted italic leading-relaxed">
            {t(`${K}.l3`)}
          </li>
        </ul>
      </div>

      {/* Notes column */}
      <div className="rounded-2xl bg-marketing-surface border border-marketing-line p-4 mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-2">
          {t(`${K}.notesHeader`)}
        </p>
        <ul className="space-y-1.5">
          <li className="text-[12.5px] text-marketing-ink font-mono leading-relaxed">
            {t(`${K}.n1`)}
          </li>
          <li className="text-[12.5px] text-marketing-ink font-mono leading-relaxed break-words">
            {t(`${K}.n2`)}
          </li>
          <li className="text-[12.5px] text-marketing-ink font-mono leading-relaxed">
            {t(`${K}.n3`)}
          </li>
        </ul>
      </div>

      {/* Read receipt footer */}
      <div className="flex items-center gap-2 text-[11px] text-marketing-muted">
        <CheckCheck
          className="size-3.5"
          style={{ color: "var(--color-marketing-sage)" }}
        />
        <span>{t(`${K}.footer`)}</span>
      </div>
    </div>
  );
}
