import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  size?: number | string;
  /** Accessible label. Omit to keep the icon decorative. */
  label?: string;
};

export function InhalationIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  label,
  ...rest
}: Props) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
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
      {...a11y}
      {...rest}
    >
      {label ? <title>{label}</title> : null}
      <rect x="12" y="3" width="6" height="7" rx="1.2" />
      <path d="M5 10h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8a3 3 0 0 1-3-3v-6z" />
      <path d="M3 13.5h1.5" />
      <path d="M2 16h2" />
      <path d="M3 18.5h1.5" />
    </svg>
  );
}

export default InhalationIcon;
