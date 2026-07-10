import { Check, Wrench, User } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * TodayMock — mirror of the authenticated Today feed.
 * Bilingual via useTranslation: literal demo strings branch on i18n.language.
 * Cast: Adam, Kim, Gabriella.
 */

const rowBase =
  "flex items-center gap-3 py-2.5 px-3 rounded-xl border border-marketing-line bg-marketing-bg";

const chipDone =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "bg-[color-mix(in_oklab,var(--color-marketing-sage)_22%,var(--color-marketing-bg))] " +
  "text-[color:var(--color-marketing-sage)]";

const chipPending =
  "text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full " +
  "border border-marketing-line text-marketing-muted";

export function TodayMock() {
  const { i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");

  const s = sv
    ? {
        today: "Idag · onsdag",
        shift: "Gabriella jobbar · 07–15",
        progress: "3 av 5 klara",
        maintenance: "Underhåll väntar: byt filter på koncentrator",
        r1: "Morgonmedicin",
        r1chip: "Given · Kim",
        upNext: "På tur",
        r2: "SpO₂-kontroll",
        r3: "Lunchmedicin",
        r4: "Vårdplatskontroll",
      }
    : {
        today: "Today · Wednesday",
        shift: "Gabriella on shift · 07–15",
        progress: "3 of 5 done",
        maintenance: "Maintenance due: change concentrator filter",
        r1: "Morning meds",
        r1chip: "Given · Kim",
        upNext: "Up next",
        r2: "SpO₂ check",
        r3: "Lunch meds",
        r4: "Care-space check",
      };

  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
            {s.today}
          </p>
          <p className="text-lg font-bold text-marketing-ink" style={{ fontFamily: "var(--font-display)" }}>
            Adam
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 border border-marketing-line bg-marketing-surface text-[11px] font-semibold text-marketing-ink">
          <User className="size-3.5" />
          {s.shift}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] text-marketing-muted mb-1.5">
          <span className="font-semibold">{s.progress}</span>
          <span>60%</span>
        </div>
        <div className="h-1.5 rounded-full bg-marketing-line overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "60%",
              background: "var(--color-marketing-sage)",
            }}
          />
        </div>
      </div>

      {/* Maintenance banner */}
      <div
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 mb-3 text-[12px]"
        style={{
          background:
            "color-mix(in oklab, oklch(0.78 0.13 70) 16%, var(--color-marketing-bg))",
          color: "oklch(0.36 0.10 55)",
        }}
      >
        <Wrench className="size-4 flex-none" />
        <span className="font-semibold">{s.maintenance}</span>
      </div>

      {/* Rows */}
      <ul className="space-y-2">
        <li className={rowBase}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">08:30</span>
          <span className="flex-1 text-[13px] text-marketing-ink truncate">{s.r1}</span>
          <span className={chipDone}>
            <Check className="size-3 inline -mt-0.5 mr-0.5" />
            {s.r1chip}
          </span>
        </li>
        <li className={rowBase}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">10:00</span>
          <span className="flex-1 text-[13px] text-marketing-ink truncate">{s.r2}</span>
          <span className={chipPending}>{s.upNext}</span>
        </li>
        <li className={rowBase}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">12:00</span>
          <span className="flex-1 text-[13px] text-marketing-ink truncate">{s.r3}</span>
          <span className={chipPending}>{s.upNext}</span>
        </li>
        <li className={rowBase}>
          <span className="font-mono text-[11px] text-marketing-muted w-10">14:00</span>
          <span className="flex-1 text-[13px] text-marketing-ink truncate">{s.r4}</span>
          <span className={chipPending}>Gabriella</span>
        </li>
      </ul>
    </div>
  );
}
