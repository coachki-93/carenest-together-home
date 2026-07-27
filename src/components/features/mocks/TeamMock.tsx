import { KeyRound, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * TeamMock — bilingual team-account card mirroring the shipped
 * TeamAccountCard flow. Shows the shared username + a masked password
 * chip and a subtle "Reset password" affordance. The three-role team
 * strip stays unchanged.
 */
export function TeamMock() {
  const { t } = useTranslation();
  const K = "featuresV2.team.mock";

  const members = [
    { name: t(`${K}.m1Name`), role: t(`${K}.m1Role`), color: "var(--color-marketing-sage)" },
    { name: t(`${K}.m2Name`), role: t(`${K}.m2Role`), color: "oklch(0.55 0.16 285)" },
    { name: t(`${K}.m3Name`), role: t(`${K}.m3Role`), color: "oklch(0.62 0.14 45)" },
  ];

  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-3">
        {t(`${K}.kicker`)}
      </p>

      {/* Username + masked password block */}
      <div
        className="rounded-2xl border border-marketing-line px-5 py-5 mb-3 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--color-marketing-sage) 10%, var(--color-marketing-bg)) 0%, var(--color-marketing-bg) 100%)",
        }}
      >
        <p
          className="text-2xl md:text-3xl font-bold text-marketing-ink tabular-nums tracking-tight text-center select-all"
          style={{ fontFamily: "var(--font-mono, ui-monospace)" }}
        >
          {t(`${K}.code`)}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-marketing-muted">
            {t(`${K}.passwordLabel`)}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-marketing-line bg-marketing-bg text-[12px] font-semibold text-marketing-ink tabular-nums"
            style={{ fontFamily: "var(--font-mono, ui-monospace)" }}
          >
            <KeyRound className="size-3 text-marketing-muted" aria-hidden />
            {t(`${K}.passwordMasked`)}
          </span>
        </div>
        <p className="text-[11px] text-marketing-muted text-center mt-3">
          {t(`${K}.codeHint`)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px] text-marketing-muted mb-5">
        <span className="flex items-center gap-1.5">
          <RotateCcw
            className="size-3.5 flex-none"
            style={{ color: "var(--color-marketing-sage)" }}
            aria-hidden
          />
          <span>{t(`${K}.expiry`)}</span>
        </span>
        <span
          className="text-[11px] font-semibold text-marketing-sage border border-marketing-sage-line rounded-full px-2.5 py-0.5 flex-none"
        >
          {t(`${K}.resetPassword`)}
        </span>
      </div>

      {/* Team strip */}
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-2">
        {t(`${K}.teamHeader`)}
      </p>
      <ul className="space-y-2 mb-4">
        {members.map((m, i) => (
          <li
            key={i}
            className="flex items-center gap-3 py-2 px-3 rounded-xl border border-marketing-line bg-marketing-bg"
          >
            <span
              className="size-7 rounded-full grid place-items-center text-[11px] font-bold text-white"
              style={{ background: m.color }}
              aria-hidden
            >
              {m.name.slice(0, 1)}
            </span>
            <span className="flex-1 text-[13px] font-semibold text-marketing-ink">
              {m.name}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-marketing-line text-marketing-muted">
              {m.role}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-marketing-muted text-center">
        {t(`${K}.footnote`)}
      </p>
    </div>
  );
}
