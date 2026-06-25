import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

/**
 * Classic L-shaped asthma inhaler (puffer) with a spray burst.
 * Lucide-style: currentColor stroke, no fill, 24x24 viewBox.
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
      {/* Canister on top */}
      <rect x="12" y="3" width="6" height="7" rx="1.2" />
      {/* Horizontal mouthpiece body (L shape) */}
      <path d="M5 10h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8a3 3 0 0 1-3-3v-6z" />
      {/* Spray puffs to the left of the mouthpiece */}
      <path d="M3 13.5h1.5" />
      <path d="M2 16h2" />
      <path d="M3 18.5h1.5" />
    </svg>
  );
}

export default InhalationIcon;
