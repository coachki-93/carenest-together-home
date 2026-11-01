/** Format a number with the app language's decimal separator (sv: "36,9"). */
export function formatLocaleNumber(n: number, lang: string, fractionDigits: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(lang.startsWith("sv") ? "sv-SE" : "en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  }).format(n);
}

const ROUTE_KEYS: Record<string, string> = {
  oral: "meds.routeOral",
  g_tube: "meds.routeGTube",
  injection: "meds.routeInjection",
  topical: "meds.routeTopical",
  inhaled: "meds.routeInhaled",
  other: "meds.routeOther",
};

/** i18n key for a medication route enum value. */
export function medRouteKey(route: string): string {
  return ROUTE_KEYS[route] ?? "meds.routeOther";
}
