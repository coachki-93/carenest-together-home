/**
 * Pure helpers for medication → inventory linking.
 *
 * The DB trigger (`reconcile_med_dose_stock`) reads a cached
 * `medications.inventory_per_dose` numeric and never converts units itself.
 * All unit conversion + validation lives here, at link-time, in the med
 * dialog. If we can't resolve a per-dose amount cleanly we store NULL and
 * the trigger no-ops — a dose write can never fail because of a bad link.
 *
 * Design rules (per N7 plan, reviewer-approved):
 * - Refuse cross-family links (e.g. mg dose vs ml stock) at link time.
 * - Refuse packaging units (box/pack) as depletion targets.
 * - Lenient `dose_unit` normalization via an explicit table — unknown units
 *   are NOT guessed; they downgrade to unrecognized → NULL perDose.
 * - `mg` is in the mass family explicitly (0.001 g), so mg meds can deplete
 *   a g/kg item.
 */
import type { UnitKind } from "./inventory";

export type UnitFamily = "volume" | "mass" | "count";

/** Canonical: ml for volume, g for mass, pcs for count. */
const VOLUME: Record<string, number> = { ml: 1, l: 1000 };
const MASS: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 };
const COUNT: Record<string, number> = { pcs: 1 };

/** Free-text `dose_unit` → normalized token (or null when unrecognized). */
const DOSE_UNIT_SYNONYMS: Record<string, string> = {
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  mg: "mg",
  milligram: "mg",
  milligrams: "mg",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  pcs: "pcs",
  pc: "pcs",
  st: "pcs",
  styck: "pcs",
  stycken: "pcs",
  tablett: "pcs",
  tabletter: "pcs",
  tablet: "pcs",
  tablets: "pcs",
  kapsel: "pcs",
  kapslar: "pcs",
  capsule: "pcs",
  capsules: "pcs",
};

export function normalizeDoseUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return DOSE_UNIT_SYNONYMS[key] ?? null;
}

function familyOf(unit: string): UnitFamily | null {
  if (unit in VOLUME) return "volume";
  if (unit in MASS) return "mass";
  if (unit in COUNT) return "count";
  return null;
}

function factorOf(unit: string): number | null {
  return VOLUME[unit] ?? MASS[unit] ?? COUNT[unit] ?? null;
}

export type PerDoseResult =
  | { kind: "ok"; perDose: number; itemUnit: UnitKind; normalizedDoseUnit: string }
  | { kind: "packaging"; itemUnit: UnitKind }
  | { kind: "unrecognized"; rawDoseUnit: string | null }
  | {
      kind: "crossFamily";
      itemUnit: UnitKind;
      normalizedDoseUnit: string;
      itemFamily: UnitFamily;
      doseFamily: UnitFamily;
    }
  | { kind: "invalidAmount" };

/**
 * Compute the effective per-dose amount, expressed in the inventory item's
 * unit. Returns a discriminated union so the caller can pick UX per case:
 *
 *   ok            → save link with perDose numeric.
 *   packaging     → block the link (box/pack aren't dosable directly).
 *   unrecognized  → allow link but store perDose = null (trigger no-ops).
 *   crossFamily   → block the link with an explicit error.
 *   invalidAmount → dose_amount missing or non-positive; treat as no per-dose.
 */
export function computePerDose(
  doseAmount: number | null | undefined,
  doseUnitRaw: string | null | undefined,
  itemUnit: UnitKind,
): PerDoseResult {
  if (itemUnit === "box" || itemUnit === "pack") {
    return { kind: "packaging", itemUnit };
  }
  const normalized = normalizeDoseUnit(doseUnitRaw ?? null);
  if (!normalized) {
    return { kind: "unrecognized", rawDoseUnit: doseUnitRaw ?? null };
  }
  if (doseAmount == null || !Number.isFinite(doseAmount) || doseAmount <= 0) {
    return { kind: "invalidAmount" };
  }
  const itemFamily = familyOf(itemUnit);
  const doseFamily = familyOf(normalized);
  if (!itemFamily || !doseFamily) {
    // Shouldn't happen given the normalization table + UnitKind exclusion of
    // box/pack above, but stay defensive.
    return { kind: "unrecognized", rawDoseUnit: doseUnitRaw ?? null };
  }
  if (itemFamily !== doseFamily) {
    return {
      kind: "crossFamily",
      itemUnit,
      normalizedDoseUnit: normalized,
      itemFamily,
      doseFamily,
    };
  }
  const fromFactor = factorOf(normalized)!;
  const toFactor = factorOf(itemUnit)!;
  const perDose = doseAmount * (fromFactor / toFactor);
  return { kind: "ok", perDose, itemUnit, normalizedDoseUnit: normalized };
}
