import {
  MessageCircle,
  Phone,
  CloudSun,
  Camera,
  Clock,
  Map,
  Music,
  Mail,
  Calculator,
  Image as ImageIcon,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * PhoneMock — decorative phone silhouette showing a believable home screen
 * where the CareNest tile pops. Purely aria-hidden. Generic lucide glyphs
 * (no imitations of Apple/Google icons) with muted tinted backgrounds sit
 * behind the real CareNest tile which lands last with a check-pop.
 *
 * Animations are gated by a parent Reveal (mk-slide-in / mk-check-pop are
 * paused until [data-visible="true"] is set on an ancestor). Reduced motion
 * lands everything in final state.
 */

type Tile = { Icon: LucideIcon; tint: string; iconClass: string };

// Soft desaturated tints; opacity ~0.75 on the glyph keeps them background.
const TILES: Tile[] = [
  { Icon: MessageCircle, tint: "bg-emerald-100/70", iconClass: "text-emerald-700/70" },
  { Icon: Phone, tint: "bg-green-100/70", iconClass: "text-green-700/70" },
  { Icon: CloudSun, tint: "bg-sky-100/70", iconClass: "text-sky-700/70" },
  { Icon: Camera, tint: "bg-slate-200/70", iconClass: "text-slate-700/70" },
  { Icon: Clock, tint: "bg-zinc-200/70", iconClass: "text-zinc-700/70" },
  // Slot 5 (0-indexed) = row 2, col 2 → CareNest tile injected here.
  { Icon: Map, tint: "bg-teal-100/70", iconClass: "text-teal-700/70" },
  { Icon: Music, tint: "bg-pink-100/70", iconClass: "text-pink-700/70" },
  { Icon: Mail, tint: "bg-blue-100/70", iconClass: "text-blue-700/70" },
  { Icon: Calculator, tint: "bg-amber-100/70", iconClass: "text-amber-700/70" },
  { Icon: ImageIcon, tint: "bg-rose-100/70", iconClass: "text-rose-700/70" },
  { Icon: Settings, tint: "bg-stone-200/70", iconClass: "text-stone-700/70" },
];

const CARE_SLOT = 5; // row 2, col 2 (0-indexed)

export function PhoneMock({ label }: { label: string }) {
  const cells: Array<Tile | "care"> = [];
  let ti = 0;
  for (let i = 0; i < 12; i++) {
    if (i === CARE_SLOT) cells.push("care");
    else cells.push(TILES[ti++]);
  }

  return (
    <div
      aria-hidden
      className="mx-auto relative w-[196px] md:w-[228px] aspect-[9/19] rounded-[2.25rem] border border-marketing-line bg-gradient-to-b from-white to-marketing-surface shadow-[0_20px_60px_-30px_rgba(60,50,120,0.35)] ring-1 ring-black/5 overflow-hidden"
    >
      {/* status bar */}
      <div className="absolute inset-x-0 top-0 h-6 flex items-center justify-between px-4 text-[9px] font-semibold text-marketing-ink/70">
        <span>9:41</span>
        <div className="flex items-center gap-[3px]">
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-marketing-ink/60" />
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-marketing-ink/60" />
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-marketing-ink/40" />
          <span className="ml-1 inline-block h-[7px] w-[12px] rounded-[2px] border border-marketing-ink/60" />
        </div>
      </div>

      {/* app grid */}
      <div className="absolute inset-x-0 top-8 bottom-8 px-3 pt-2">
        <div className="grid grid-cols-4 gap-y-3 gap-x-2 justify-items-center">
          {cells.map((c, i) => {
            if (c === "care") {
              return (
                <div
                  key={i}
                  className="relative flex flex-col items-center z-10"
                  style={{ ["--mk-delay" as string]: "420ms" }}
                >
                  <span className="mk-check-pop">
                    <img
                      src="/landing/carenest-app-icon.webp"
                      alt=""
                      width={62}
                      height={62}
                      className="h-[54px] w-[54px] md:h-[62px] md:w-[62px] rounded-[14px] shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--primary)_55%,transparent)] ring-1 ring-black/5"
                      draggable={false}
                      style={{
                        boxShadow:
                          "0 0 0 4px color-mix(in oklab, var(--primary) 18%, transparent), 0 12px 30px -10px color-mix(in oklab, var(--primary) 55%, transparent)",
                      }}
                    />
                  </span>
                  <span className="mt-1 text-[9px] font-semibold text-marketing-ink/90">
                    {label}
                  </span>
                </div>
              );
            }
            const { Icon, tint, iconClass } = c;
            const delay = 60 + i * 30;
            return (
              <span
                key={i}
                className={`mk-slide-in flex h-[38px] w-[38px] items-center justify-center rounded-[10px] ${tint}`}
                style={{ ["--mk-delay" as string]: `${delay}ms` }}
              >
                <Icon className={`h-[18px] w-[18px] ${iconClass}`} strokeWidth={2} />
              </span>
            );
          })}
        </div>
      </div>

      {/* home indicator */}
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <div className="h-1 w-16 rounded-full bg-marketing-line" />
      </div>
    </div>
  );
}
