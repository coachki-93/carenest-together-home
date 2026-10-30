import { describe, it, expect } from "vitest";
import { canManageAppointment } from "@/lib/data/appointments";

const OWNER_ID = "owner";
const CG = "caregiver";

describe("canManageAppointment", () => {
  it("owner can manage any task", () => {
    expect(canManageAppointment({ created_by: CG }, { userId: OWNER_ID, isOwner: true })).toBe(true);
  });
  it("caregiver can manage their own one-off task", () => {
    expect(canManageAppointment({ created_by: CG }, { userId: CG, isOwner: false })).toBe(true);
  });
  it("caregiver cannot manage the owner's task", () => {
    expect(canManageAppointment({ created_by: OWNER_ID }, { userId: CG, isOwner: false })).toBe(false);
  });
  it("occurrence of caregiver's series stays manageable even if the owner made the override", () => {
    // expanded instances carry the series master's created_by
    expect(canManageAppointment({ created_by: CG }, { userId: CG, isOwner: false })).toBe(true);
  });
  it("occurrence of the owner's series is not manageable by a caregiver", () => {
    expect(canManageAppointment({ created_by: OWNER_ID }, { userId: CG, isOwner: false })).toBe(false);
  });
  it("no user means no access", () => {
    expect(canManageAppointment({ created_by: CG }, { userId: null, isOwner: false })).toBe(false);
  });
});
