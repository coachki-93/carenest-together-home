import { useMemo } from "react";
import { useSession } from "@/lib/auth/use-profile";
import { useActiveCaregiverProfile } from "@/lib/data/active-profile";
import type { CaregiverProfile } from "@/lib/data/caregiver-profiles";

/**
 * The shared "current actor" identity for the app.
 *
 * A caregiver's identity is (auth user, caregiver profile). Multiple caregiver
 * profiles can share one auth account (e.g. municipal staff all signed in as
 * "Kommun" but acting as different individuals). Any write that identifies a
 * *person* — read receipts, med logs, maintenance actor, etc. — must use this
 * hook so the caregiver profile travels with the record.
 *
 * `needsProfileSelection` is true when the account has more than one profile
 * available but hasn't selected an active one. Callers must NOT silently
 * write `null` in that case (a null-profile write on a shared account is
 * indistinguishable across caregivers). Instead, call `guardActingProfile`
 * to abort with a user-facing prompt.
 */
export interface CurrentActor {
  /** Auth user id (null while loading or signed out). */
  userId: string | null;
  /** Family currently being viewed (null while loading). */
  familyId: string | null;
  /** Active caregiver profile id, if any. */
  activeProfileId: string | null;
  /** The active caregiver profile row, if any. */
  activeProfile: CaregiverProfile | null;
  /** All caregiver profiles belonging to this user in this family. */
  profiles: CaregiverProfile[];
  /**
   * True when the account has 2+ profiles but none is currently selected.
   * Writes that need per-caregiver attribution must abort in this state.
   */
  needsProfileSelection: boolean;
}

export function useCurrentActor(familyId: string | undefined | null): CurrentActor {
  const { user } = useSession();
  const { profiles, activeId, activeProfile } = useActiveCaregiverProfile(
    familyId,
    user?.id,
  );

  return useMemo<CurrentActor>(
    () => ({
      userId: user?.id ?? null,
      familyId: familyId ?? null,
      activeProfileId: activeId,
      activeProfile,
      profiles,
      needsProfileSelection: profiles.length > 1 && !activeId,
    }),
    [user?.id, familyId, activeId, activeProfile, profiles],
  );
}

/**
 * Guard for write paths that require a caregiver profile on shared accounts.
 *
 * Returns the caregiver_profile_id to write (may be `null` when the account
 * has only one profile — that is unambiguous). If the account has multiple
 * profiles but none is active, returns `{ blocked: true }` so the caller can
 * surface a prompt (e.g. toast: "Select an active caregiver profile") and
 * abort the mutation.
 */
export function guardActingProfile(
  actor: CurrentActor,
): { blocked: true } | { blocked: false; caregiverProfileId: string | null } {
  if (actor.needsProfileSelection) return { blocked: true };
  return { blocked: false, caregiverProfileId: actor.activeProfileId };
}
