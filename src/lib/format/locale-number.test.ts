import { describe, expect, it } from "vitest";
import { formatLocaleNumber, medRouteKey } from "./locale-number";

describe("formatLocaleNumber", () => {
  it("uses a comma in Swedish", () => expect(formatLocaleNumber(36.9, "sv", 1)).toBe("36,9"));
  it("uses a dot in English", () => expect(formatLocaleNumber(36.9, "en", 1)).toBe("36.9"));
});

describe("medRouteKey", () => {
  it("maps inhaled to a translated key", () => expect(medRouteKey("inhaled")).toBe("meds.routeInhaled"));
});
