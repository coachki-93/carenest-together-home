import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

/**
 * Side-profile head breathing in wind streaks.
 * Drawn in the lucide style: currentColor stroke, no fill.
 */
export function InhalationIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...rest
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Head profile: forehead, nose, mouth notch, chin, jaw */}
      <path d="M19 12c0-3.9-2.9-7-6.5-7S6 8.1 6 12c0 1.3.3 2.4.9 3.4.3.5.4 1 .4 1.5V20" />
      {/* Nose tip */}
      <path d="M6 12.2l-1.6.8 1.6 1" />
      {/* Mouth */}
      <path d="M6.8 16h2.4" />
      {/* Wind streaks flowing into the mouth */}
      <path d="M3 14.5h2.2" />
      <path d="M1.5 16.2h3" />
      <path d="M2.5 17.9c.6.5 1.4.5 2 0" />
    </svg>
  );
}

export default InhalationIcon;
