import {
  Activity,
  AlertTriangle,
  Brain,
  Frown,
  MoreHorizontal,
  Utensils,
  Wind,
  Zap,
} from "lucide-react";
import type { CareEventType } from "@/lib/data/care-events";

export interface CareEventMeta {
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind bg class for the tinted tile background. */
  bg: string;
  /** Tailwind text class carrying the saturated icon color. */
  text: string;
}

/**
 * Single source of truth for care-event visual identity.
 * Used by:
 *  - CareEventDialog type-picker chips (full tile: bg + text)
 *  - events.tsx list rows (full tile: bg + text)
 *  - events.tsx filter pills (small icon: text only when unselected)
 */
export const CARE_EVENT_META: Record<CareEventType, CareEventMeta> = {
  seizure: { icon: Zap, bg: "bg-violet-50", text: "text-violet-600" },
  desaturation: { icon: Wind, bg: "bg-sky-50", text: "text-sky-600" },
  vomiting: { icon: Frown, bg: "bg-emerald-50", text: "text-emerald-600" },
  feed_issue: { icon: Utensils, bg: "bg-amber-50", text: "text-amber-700" },
  breathing_difficulty: {
    icon: Activity,
    bg: "bg-cyan-50",
    text: "text-cyan-600",
  },
  behavioural: { icon: Brain, bg: "bg-pink-50", text: "text-pink-600" },
  injury: { icon: AlertTriangle, bg: "bg-rose-50", text: "text-rose-600" },
  other: { icon: MoreHorizontal, bg: "bg-slate-100", text: "text-slate-700" },
};
