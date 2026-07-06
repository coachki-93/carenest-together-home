
## Goal

Add a "Who's working this shift?" selector to the care-place check dialog and attribute the resulting row to a `caregiver_profile_id`. **Precondition:** fix `useActiveCaregiverProfile` to share state across instances first, so the selector, header, and guarded write all see the same active profile within one render.

## Order of work

1. Rewrite `src/lib/data/active-profile.ts` (shared store).
2. Migration (already applied — `caregiver_profile_id` on `care_place_checks`, updated INSERT policy).
3. Dialog UI + write path + display + i18n.

## 1. Hook fix — `src/lib/data/active-profile.ts`

Replace per-instance `useState(storedId)` with a module-level store keyed by `${familyId}.${userId}`, consumed via `useSyncExternalStore`. Public API unchanged (`profiles`, `activeId`, `activeProfile`, `setActive`, `isLoading`) so header (`ActiveProfileSwitcher`), `useCurrentActor`, and every guarded write get the fix without edits.

Shape:

- `const memory = new Map<Key, string | null>()` — hot cache, primed lazily from `localStorage`.
- `const listeners = new Map<Key, Set<() => void>>()` — per-key subscribers.
- `setStored(key, v)` writes memory + `localStorage` + notifies subscribers synchronously (same tick, same tab).
- `subscribe(key, cb)` returns unsubscribe. `getSnapshot(key)` returns `memory` or reads `localStorage` once.
- Module-level `window.addEventListener("storage", ...)` updates `memory` + notifies on cross-tab writes.
- `getServerSnapshot` returns `null` (SSR-safe).
- When `familyId`/`userId` is missing, subscribe becomes a no-op and snapshot is `null` — same shape as today's uninitialized state.

This also repairs the pre-existing bug where switching profiles in the header didn't propagate to already-mounted pages until remount.

## 2. Migration (applied)

```sql
ALTER TABLE public.care_place_checks
  ADD COLUMN caregiver_profile_id uuid
    REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

CREATE INDEX care_place_checks_caregiver_profile_idx
  ON public.care_place_checks(caregiver_profile_id)
  WHERE caregiver_profile_id IS NOT NULL;

DROP POLICY IF EXISTS "Family members can insert checks" ON public.care_place_checks;

CREATE POLICY "Family members can insert checks"
  ON public.care_place_checks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_family_member(family_id, auth.uid())
    AND performed_by = auth.uid()
    AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
  );
```

## 3. Dialog UI — `src/components/carenest/CarePlaceCheckBanner.tsx`

Between `DialogHeader` and the questions:

- New section titled `t("carePlace.whoWorking")`.
- `useActiveCaregiverProfile(familyId, userId)` → wrap-flex row of pill buttons, one per profile (color dot + name). Active = primary filled; others = outline. Tap → `setActive(p.id)`.
- Hidden entirely when `profiles.length === 0`.
- Countdown stays pinned in the header, section sits just below it so the timer is never pushed off-screen.

## Write path — same file + `src/lib/data/care-place-checks.ts`

- In `handleSubmit`: `const actor = useCurrentActor(familyId)` (top of component); `const guard = guardActingProfile(actor)`. If `guard.blocked` → `toast.error(t("carePlace.pickProfileFirst"))` + return.
- Pass `caregiver_profile_id: guard.caregiverProfileId` into `submit.mutateAsync`.
- Submit button also gets `disabled: ... || (actor.profiles.length > 1 && !actor.activeProfileId)`.
- `SubmitCheckInput` extended with `caregiver_profile_id?: string | null`; the insert payload includes it.

Because the hook is now shared, the same `activeProfileId` value flows through the dialog's own `setActive` call → the `useCurrentActor` reading it → `handleSubmit`, all inside the same render.

## Display

Every completed-check surface (`useCarePlaceCheckHistory` list rows in the settings/history views) renders:

```tsx
<ByProfile
  familyId={familyId}
  caregiverProfileId={c.caregiver_profile_id}
  authorUserId={c.performed_by}
  viewerUserId={me.id}
  label={t("carePlace.checkedBy")}
/>
```

Historical rows keep working — `caregiver_profile_id` is `NULL`, `ByProfile` falls back to the account.

## i18n keys (en + sv)

Under the existing `carePlace` block:

- `whoWorking` — "Who's working this shift?" / "Vem jobbar det här passet?"
- `checkedBy` — "Checked by" / "Kontrollerad av"
- `pickProfileFirst` — "Choose who's working this shift first." / "Välj vem som jobbar det här passet först."

## Verification

1. Single-profile account: selector shows one preselected pill; submit writes the row with that `caregiver_profile_id`.
2. Multi-profile shared account, no stored choice: preselect follows suggestion → first-profile chain; submit works.
3. **Cross-instance test:** open the dialog, tap a different profile in the selector, then submit. The inserted `care_place_checks` row carries the newly tapped `caregiver_profile_id` (this is the specific case the hook fix unblocks).
4. Tapping in the dialog also updates the header pill immediately — no remount required (proves the shared store works).
5. History surface shows "Checked by {name}" with color dot; NULL rows fall back to the account name.

## Out of scope

- Handover-prefill care-place lines (new prefill source, not an edit — propose separately).
- Retro-attribution of pre-migration rows (leave `NULL`).
