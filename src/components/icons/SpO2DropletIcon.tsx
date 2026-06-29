import type { ImgHTMLAttributes } from "react";
import spo2IconAsset from "@/assets/spo2-icon.png.asset.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  size?: number | string;
  /**
   * Accessible label. Provide when the icon stands alone (no adjacent text).
   * Omit to keep the icon decorative (`aria-hidden`).
   */
  label?: string;
};

export function SpO2DropletIcon({ size, className, style, label, ...rest }: Props) {
  const sizeStyle =
    size !== undefined ? { width: size, height: size } : undefined;
  const a11y = label
    ? { role: "img" as const, "aria-label": label, alt: label }
    : { "aria-hidden": true, alt: "" };
  return (
    <img
      src={spo2IconAsset.url}
      className={className}
      style={{ objectFit: "contain", ...sizeStyle, ...style }}
      {...a11y}
      {...rest}
    />
  );
}

export default SpO2DropletIcon;
