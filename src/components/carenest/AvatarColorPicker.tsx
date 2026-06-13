import { cn } from "@/lib/utils";

export const AVATAR_COLORS = [
  "#A78BFA", // purple
  "#60A5FA", // blue
  "#34D399", // green
  "#FBBF24", // amber
  "#FB7185", // rose
  "#F472B6", // pink
  "#22D3EE", // cyan
  "#F97316", // orange
];

interface Props {
  value: string | null;
  onChange: (color: string) => void;
}

export function AvatarColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {AVATAR_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "size-10 rounded-full transition-transform ring-offset-2 ring-offset-background",
            value === c ? "ring-2 ring-primary scale-110" : "hover:scale-105",
          )}
          style={{ backgroundColor: c }}
          aria-label={`Choose color ${c}`}
        />
      ))}
    </div>
  );
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
