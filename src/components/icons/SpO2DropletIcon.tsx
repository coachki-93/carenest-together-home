import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

/**
 * SpO₂ droplet icon — Lucide-style outlined droplet with "O₂" mark inside.
 * Uses currentColor so it inherits tone classes like other icons.
 */
export function SpO2DropletIcon({
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
      {/* Droplet outline */}
      <path d="M12 2.5c3.2 4 6.5 7.6 6.5 11.5a6.5 6.5 0 1 1-13 0c0-3.9 3.3-7.5 6.5-11.5z" />
      {/* "O" */}
      <ellipse cx="10.5" cy="14.5" rx="2.1" ry="2.6" />
      {/* "₂" subscript */}
      <path d="M13.8 16.2c.2-.5.8-.7 1.2-.4.4.3.4.9 0 1.3l-1.2 1.1h1.4" />
    </svg>
  );
}

export default SpO2DropletIcon;
