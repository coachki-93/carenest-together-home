import {
  HeartHandshake,
  Sunrise,
  Activity,
  Wind,
  CupSoda,
  Zap,
  Bell,
  KeyRound,
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

/**
 * Optional slot identifier for pages that render an embedded interactive
 * component below the body copy (e.g. the notifications enable card).
 */
export type WelcomeSlot = "notifications";

export interface WelcomePage {
  key: string;
  icon: LucideIcon;
  tone: WelcomeTone;
  titleKey: string;
  bodyKey: string;
  /** Optional secondary line rendered under body (e.g. install hint). */
  hintKey?: string;
  /** Optional embedded interactive slot rendered inside the page. */
  slot?: WelcomeSlot;
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
const NOTIFICATIONS: WelcomePage = {
  key: "notifications",
  icon: Bell,
  tone: "amber",
  titleKey: "welcome.pages.notifications.title",
  bodyKey: "welcome.pages.notifications.body",
  hintKey: "welcome.pages.notifications.installHint",
  slot: "notifications",
};
const TEAM_LOGIN: WelcomePage = {
  key: "teamLogin",
  icon: KeyRound,
  tone: "primary",
  titleKey: "welcome.pages.teamLogin.title",
  bodyKey: "welcome.pages.teamLogin.body",
};
const CLOSE: WelcomePage = {
  key: "close",
  icon: ArrowRight,
  tone: "primary",
  titleKey: "welcome.pages.close.title",
  bodyKey: "welcome.pages.close.body",
};

const FEEDING_CAPS = new Set(["g_tube", "nj_tube", "tpn", "fluid_tracking"]);
const CARE_SPECIFIC_CAP = 2;

export interface BuildWelcomeOptions {
  hasTeamAccount?: boolean;
}

/**
 * Build the ordered scenario pages for the welcome tour.
 *
 * Order: [INTRO, HANDOVER, ...care-specific (capped), NOTIFICATIONS,
 *         (TEAM_LOGIN if hasTeamAccount), CLOSE].
 *
 * The cap applies ONLY to the care-specific middle. The trailing group
 * (NOTIFICATIONS + optional TEAM_LOGIN + CLOSE) is always appended and
 * never sliced off — NOTIFICATIONS and CLOSE are guaranteed to render.
 * Max length: 2 + CARE_SPECIFIC_CAP + 3 = 7 (heavy staff family), or 6
 * without staff.
 */
export function buildWelcomePages(
  rawCareNeeds: unknown,
  opts: BuildWelcomeOptions = {},
): WelcomePage[] {
  const cn = parseCareNeeds(rawCareNeeds);
  const caps = new Set(cn.capabilities);

  const careSpecific: WelcomePage[] = [];
  if (hasModule(rawCareNeeds, "oxygen")) careSpecific.push(OXYGEN);
  if ([...FEEDING_CAPS].some((k) => caps.has(k))) careSpecific.push(FEEDING);
  if (caps.has("seizures")) careSpecific.push(EVENTS);
  else if (visibleVitalsFor(cn).length > 0 && caps.size > 0) {
    careSpecific.push(VITALS);
  }
  const cappedCare = careSpecific.slice(0, CARE_SPECIFIC_CAP);

  const pages: WelcomePage[] = [INTRO, HANDOVER, ...cappedCare, NOTIFICATIONS];
  if (opts.hasTeamAccount) pages.push(TEAM_LOGIN);
  pages.push(CLOSE);
  return pages;
}
