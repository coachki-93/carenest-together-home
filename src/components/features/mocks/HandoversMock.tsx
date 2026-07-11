import { CheckCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

/**
 * HandoversMock — bilingual glass sheet mirroring the auto-filled handover
 * on /handover. Every string here matches the exact emission format from
 * src/lib/data/handover-prefill.ts.
 *
 * Choreography: the parent FeatureBand wraps the visual in a Reveal that
 * flips data-visible="true" on scroll; mk-slide-in descendants play once
 * with staggered --mk-delay values so the sheet assembles itself
 * (meds l1→l3, notes n1→n3, then the read receipt). Reduced motion is
 * handled globally by the mk-slide-in stylesheet — everything renders in
 * its final state immediately.
 *
 * Wrapping: each line uses padding-left + negative text-indent so wrapped
 * continuations align under the line's text after the leading "• ", not
 * under the bullet itself.
 */
export function HandoversMock() {
  const { t } = useTranslation();
  const K = "featuresV2.handovers.mock";

  const hanging: CSSProperties = {
    paddingLeft: "1em",
    textIndent: "-1em",
  };

  const line = (delay: number, extra: string = ""): CSSProperties => ({
    ...hanging,
    ["--mk-delay" as string]: `${delay}ms`,
    ...(extra ? {} : {}),
  });

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
          <li
            className="mk-slide-in text-[12.5px] text-marketing-ink font-mono leading-relaxed"
            style={line(0)}
          >
            {t(`${K}.l1`)}
          </li>
          <li
            className="mk-slide-in text-[12.5px] text-marketing-ink font-mono leading-relaxed"
            style={line(150)}
          >
            {t(`${K}.l2`)}
          </li>
          <li
            className="mk-slide-in text-[12.5px] text-marketing-muted italic leading-relaxed"
            style={line(300)}
          >
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
          <li
            className="mk-slide-in text-[12.5px] text-marketing-ink font-mono leading-relaxed"
            style={line(450)}
          >
            {t(`${K}.n1`)}
          </li>
          <li
            className="mk-slide-in text-[12.5px] text-marketing-ink font-mono leading-relaxed break-words"
            style={line(600)}
          >
            {t(`${K}.n2`)}
          </li>
          <li
            className="mk-slide-in text-[12.5px] text-marketing-ink font-mono leading-relaxed"
            style={line(750)}
          >
            {t(`${K}.n3`)}
          </li>
        </ul>
      </div>

      {/* Read receipt footer */}
      <div
        className="mk-slide-in flex items-center gap-2 text-[11px] text-marketing-muted"
        style={{ ["--mk-delay" as string]: "950ms" }}
      >
        <CheckCheck
          className="size-3.5"
          style={{ color: "var(--color-marketing-sage)" }}
        />
        <span>{t(`${K}.footer`)}</span>
      </div>
    </div>
  );
}
