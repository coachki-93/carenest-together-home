/**
 * PhoneMock — tiny decorative phone silhouette showing the real CareNest
 * home-screen tile (uses /apple-touch-icon.png). Aria-hidden; purely a
 * visual promise of the install outcome.
 */
export function PhoneMock({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      className="mx-auto relative w-[176px] md:w-[208px] aspect-[9/19] rounded-[2.25rem] border border-marketing-line bg-gradient-to-b from-white to-marketing-surface shadow-[0_20px_60px_-30px_rgba(60,50,120,0.35)] ring-1 ring-black/5 overflow-hidden"
    >
      {/* status bar sliver */}
      <div className="absolute inset-x-0 top-0 h-6 flex items-center justify-center">
        <div className="h-1 w-16 rounded-full bg-marketing-line" />
      </div>
      {/* home tile */}
      <div className="absolute inset-x-0 top-[38%] flex flex-col items-center gap-2 px-4">
        <img
          src="/apple-touch-icon.png"
          alt=""
          width={64}
          height={64}
          className="h-14 w-14 rounded-2xl shadow-md"
          draggable={false}
        />
        <span className="text-[11px] font-medium text-marketing-ink/85">
          {label}
        </span>
      </div>
      {/* home indicator */}
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <div className="h-1 w-16 rounded-full bg-marketing-line" />
      </div>
    </div>
  );
}
