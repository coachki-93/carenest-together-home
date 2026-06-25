import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

/**
 * SpO₂ droplet icon — solid red droplet with white "oxygen bubbles" inside.
 * Uses explicit colors so it reads as an oxygen/blood-oxygen mark regardless of tone.
 */
export function SpO2DropletIcon({
  size = 24,
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
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Red droplet body */}
      <path
        d="M12 2.5c3.4 4.2 6.8 7.9 6.8 11.9a6.8 6.8 0 1 1-13.6 0c0-4 3.4-7.7 6.8-11.9z"
        fill="#DC2626"
      />
      {/* White oxygen bubbles */}
      <circle cx="9.2" cy="13" r="1.6" fill="#ffffff" />
      <circle cx="13.6" cy="15.6" r="2.1" fill="#ffffff" />
      <circle cx="11" cy="17.8" r="0.9" fill="#ffffff" />
    </svg>
  );
}

export default SpO2DropletIcon;
