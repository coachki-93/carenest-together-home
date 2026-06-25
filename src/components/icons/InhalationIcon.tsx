import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

/**
 * Side-profile head inhaling wind streaks.
 * Lucide-style: currentColor stroke, no fill, optimized for 24px.
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
      {/* Head profile facing left: forehead → nose → lips → chin → jaw → neck */}
      <path d="M20 4c-4 0-7 3-7 7 0 1 .2 1.8.6 2.5L11 14l1.2 1.2-1 1.8 1.6.6-.3 1.9c2.1.3 3.5-.4 3.5-2V16" />
      {/* Wind streaks flowing toward the nose */}
      <path d="M3 11h6" />
      <path d="M2 14h5" />
      <path d="M5 17h3" />
    </svg>
  );
}

export default InhalationIcon;
