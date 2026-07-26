import {
  HeartHandshake,
  Sunrise,
  Activity,
  Wind,
  CupSoda,
  Zap,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { parseCareNeeds } from "@/lib/care-needs/parse";
import { visibleVitalsFor } from "@/lib/care-needs/vitals";
import { hasModule } from "@/lib/care-needs/modules";

export type WelcomeTone =
  | "primary"
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "rose";

export interface WelcomePage {
  key: string;
  icon: LucideIcon;
  tone: WelcomeTone;
  titleKey: string;
  bodyKey: string;
}

const INTRO: WelcomePage = {
  key: "intro",
  icon: HeartHandshake,
  tone: "primary",
  titleKey: "welcome.pages.intro.title",
  bodyKey: "welcome.pages.intro.body",
};
const HANDOVER: WelcomePage = {
  key: "handover",
  icon: Sunrise,
  tone: "amber",
  titleKey: "welcome.pages.handover.title",
  bodyKey: "welcome.pages.handover.body",
};
const OXYGEN: WelcomePage = {
  key: "oxygen",
  icon: Wind,
  tone: "sky",
  titleKey: "welcome.pages.oxygen.title",
  bodyKey: "welcome.pages.oxygen.body",
};
const FEEDING: WelcomePage = {
  key: "feeding",
  icon: CupSoda,
  tone: "emerald",
  titleKey: "welcome.pages.feeding.title",
  bodyKey: "welcome.pages.feeding.body",
};
const EVENTS: WelcomePage = {
  key: "events",
  icon: Zap,
  tone: "violet",
  titleKey: "welcome.pages.events.title",
  bodyKey: "welcome.pages.events.body",
};
const VITALS: WelcomePage = {
  key: "vitals",
  icon: Activity,
  tone: "rose",
  titleKey: "welcome.pages.vitals.title",
  bodyKey: "welcome.pages.vitals.body",
};
const TEAM: WelcomePage = {
  key: "team",
  icon: Users,
  tone: "primary",
  titleKey: "welcome.pages.team.title",
  bodyKey: "welcome.pages.team.body",
};
const CLOSE: WelcomePage = {
  key: "close",
  icon: ArrowRight,
  tone: "primary",
  titleKey: "welcome.pages.close.title",
  bodyKey: "welcome.pages.close.body",
};

const FEEDING_CAPS = new Set(["g_tube", "nj_tube", "tpn", "fluid_tracking"]);

/**
 * Build the ordered scenario pages for the welcome tour based on the
 * child's care_needs. Rules:
 *   - INTRO + HANDOVER always lead.
 *   - Care-specific pages appended in a fixed order (oxygen, feeding, events/vitals).
 *   - TEAM always follows the care-specific block.
 *   - CLOSE is ALWAYS the final page (carries the "Take me to the dashboard" CTA).
 *   - Cap total at 5: cap is applied to the [INTRO, HANDOVER, ...care, TEAM]
 *     head — CLOSE is appended after the cap and is never dropped.
 */
export function buildWelcomePages(rawCareNeeds: unknown): WelcomePage[] {
  const cn = parseCareNeeds(rawCareNeeds);
  const caps = new Set(cn.capabilities);

  const careSpecific: WelcomePage[] = [];
  if (hasModule(rawCareNeeds, "oxygen")) careSpecific.push(OXYGEN);
  if ([...FEEDING_CAPS].some((k) => caps.has(k))) careSpecific.push(FEEDING);
  if (caps.has("seizures")) careSpecific.push(EVENTS);
  else if (visibleVitalsFor(cn).length > 0 && caps.size > 0) {
    // Only show the vitals page for children who explicitly selected some
    // care needs — the generic fallback (no caps) shouldn't get it.
    careSpecific.push(VITALS);
  }

  const head: WelcomePage[] = [INTRO, HANDOVER, ...careSpecific, TEAM];
  // Cap the head at 4 so INTRO + HANDOVER + up to 1 care-specific + TEAM fit,
  // then CLOSE is always appended — max 5 pages total, CLOSE guaranteed last.
  const capped = head.slice(0, 4);
  return [...capped, CLOSE];
}
