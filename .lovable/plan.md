# Manual "pause oxygen at home" feature

A caregiver can pause the active tank at home (e.g. child disconnected for a bath), separate from hospital mode. A paused tank silences all oxygen alarms, so the feature is built fail-safe: a persistent banner + a periodic "still paused?" push make sure it is never forgotten.

## 1 — Migration (shown here in full before applying)

```sql
-- New columns on oxygen_tanks
ALTER TABLE public.oxygen_tanks
  ADD COLUMN pause_reason text,
  ADD COLUMN paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN paused_caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.oxygen_tanks
  ADD CONSTRAINT oxygen_tanks_pause_reason_check
  CHECK (pause_reason IS NULL OR pause_reason IN ('hospital', 'manual'));

-- Backfill: today only hospital mode can pause a tank
UPDATE public.oxygen_tanks
  SET pause_reason = 'hospital'
  WHERE paused_at IS NOT NULL AND pause_reason IS NULL;

-- Manual pause/resume RPC
CREATE OR REPLACE FUNCTION public.set_oxygen_tank_paused(
  _tank_id uuid,
  _paused boolean,
  _caregiver_profile_id uuid DEFAULT NULL
)
RETURNS public.oxygen_tanks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.oxygen_tanks%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM public.oxygen_tanks WHERE id = _tank_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tank not found'; END IF;
  IF NOT public.is_family_member(v_row.family_id, v_uid) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;
  IF v_row.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'Tank is no longer active';
  END IF;
  IF NOT public.caregiver_profile_in_family(_caregiver_profile_id, v_row.family_id) THEN
    RAISE EXCEPTION 'Caregiver profile does not belong to this family';
  END IF;

  IF _paused THEN
    IF v_row.paused_at IS NOT NULL THEN
      RAISE EXCEPTION 'Tank is already paused';
    END IF;
    UPDATE public.oxygen_tanks
      SET paused_at = now(),
          pause_reason = 'manual',
          paused_by = v_uid,
          paused_caregiver_profile_id = _caregiver_profile_id,
          updated_at = now()
      WHERE id = _tank_id
      RETURNING * INTO v_row;
  ELSE
    IF v_row.paused_at IS NULL THEN
      RAISE EXCEPTION 'Tank is not paused';
    END IF;
    IF v_row.pause_reason IS NOT NULL AND v_row.pause_reason <> 'manual' THEN
      RAISE EXCEPTION 'Tank is paused by hospital mode — turn off hospital mode to resume';
    END IF;
    UPDATE public.oxygen_tanks
      SET paused_seconds = paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::bigint),
          paused_at = NULL,
          pause_reason = NULL,
          paused_by = NULL,
          paused_caregiver_profile_id = NULL,
          last_checked_at = now(),
          updated_at = now()
      WHERE id = _tank_id
      RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_oxygen_tank_paused(uuid, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_oxygen_tank_paused(uuid, boolean, uuid) TO authenticated, service_role;

-- Hospital mode: stamp pause_reason on the tanks it pauses; on OFF only
-- resume hospital-paused tanks so a manually paused tank stays paused.
CREATE OR REPLACE FUNCTION public.set_family_hospital_mode(_family_id uuid, _on boolean, _paused jsonb DEFAULT NULL::jsonb)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_family_owner(_family_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the family owner can change hospital mode';
  END IF;
  IF _on THEN
    UPDATE public.families
      SET at_hospital_since = COALESCE(at_hospital_since, now()),
          hospital_paused = COALESCE(_paused, hospital_paused),
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    UPDATE public.oxygen_tanks
      SET paused_at = now(),
          pause_reason = 'hospital',
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NULL
        AND (
          SELECT COALESCE((f.hospital_paused ->> 'oxygen')::boolean, true)
          FROM public.families f WHERE f.id = _family_id
        );
  ELSE
    UPDATE public.families
      SET at_hospital_since = NULL,
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    UPDATE public.oxygen_tanks
      SET paused_seconds = paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::bigint),
          paused_at = NULL,
          pause_reason = NULL,
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NOT NULL
        AND (pause_reason = 'hospital' OR pause_reason IS NULL);
  END IF;
  RETURN v_ts;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_family_hospital_mode(uuid, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_family_hospital_mode(uuid, boolean, jsonb) TO authenticated, service_role;
```

Notes on the migration:
- The 3-arg `set_family_hospital_mode` is the one the app calls. A legacy 2-arg overload still exists in the DB but is unused by the app; leaving it untouched (it pauses without stamping `pause_reason`, which the new OFF path still resumes via the `pause_reason IS NULL` clause — consistent). Flagging rather than dropping it, since dropping is a breaking change you didn't ask for.
- `paused_by` FKs `auth.users` — against the general project rule, but it mirrors the existing `oxygen_tanks.created_by` FK and matches your spec exactly.

## 2 — "Still paused?" reminder in `src/routes/api/public/hooks/oxygen-low-sweep.ts`

Replace the blanket `if (tank.paused_at) continue;` with:
- `pause_reason = 'hospital'` (or null) or family oxygen-paused → skip, as today.
- `pause_reason = 'manual'` → skip Pass A and the normal Pass B; instead run `shouldSendCheckReminder({ startedAt: tank.paused_at, lastCheckedAt: tank.last_checked_at, checkReminderSentAt: tank.check_reminder_sent_at, intervalMinutes: checkInterval, tankTotalMinutes: null, now })`. On fire: push + stamp `check_reminder_sent_at`.
- New copy block (family language): sv "⏸️ Syrgasen är pausad" / "Pausad sedan {HH:MM}. Fortfarande avstängd? Tryck Återuppta i appen när ni kopplar på igen."; en "⏸️ Oxygen is paused" / "Paused since {HH:MM}. Still off? Tap Resume in the app when you reconnect." Time formatted in the family timezone (needs `timezone` added to the families select). Category `"oxygen"`, tag `oxygen-paused-{tank.id}`, url `/oxygen`. Per-tank try/catch kept.
- Tank select gains `pause_reason`.

## 3 — Oxygen page + hooks

- `src/lib/data/oxygen.ts`: new `usePauseTank` / `useResumeTank` calling `supabase.rpc("set_oxygen_tank_paused", ...)`, invalidating the oxygen queries.
- `src/routes/_authenticated/oxygen.tsx`:
  - Running tank: "Pausa" outline button → small confirm dialog ("Pausa syrgasen? Nedräkningen stannar och larmen pausas tills du återupptar."). Uses `guardActingProfile` like other caregiver writes.
  - Manually paused tank: neutral info row "Pausad sedan {HH:MM} av {name}" (caregiver profile name if set, else the pausing user's full name, else nothing) + prominent "Återuppta" button. "Change flow" and "Confirm" hidden; "Replace tank" kept.
  - Hospital-paused tank: unchanged (existing `oxygen.pausedHospital`, no resume button).

## 4 — Today banner (`OxygenCheckBanner.tsx`)

Extend the existing component:
- Manually paused tank → calm neutral (muted, not amber) persistent banner: "Syrgas pausad sedan {HH:MM}" + "Återuppta" button (calls `useResumeTank`).
- When `isOxygenCheckOverdue({ startedAt: tank.paused_at, lastCheckedAt, intervalMinutes, tankTotalMinutes: null, now })` is true → switches to the amber styling and adds a "Fortfarande avstängd" button calling the existing `useConfirmTank` (stamps `last_checked_at`, resets both clocks).
- Hospital-paused tank → no banner (existing `tank.paused_at` early-return becomes reason-aware).

## 5 — Handover prefill (`handover-prefill.ts`)

The current oxygen query only returns tanks started/replaced inside the shift window, so a tank paused before the shift wouldn't appear. Adding a small separate query for the currently active tank (`replaced_at IS NULL`); if its `pause_reason = 'manual'` at prefill time, append one line "Syrgas pausad sedan {HH:MM}" / "Oxygen paused since {HH:MM}" in family tz.

## 6 — i18n

New keys in `en.ts` + `sv.ts` under `oxygen.*`: pause/resume button labels, confirm dialog copy, "paused since … by …", banner title/body, "Still off?" confirm label, push copy lives in the sweep (not i18n, matching existing push copy). Exact key parity; natural Swedish.

## 7 — Tests & verification

- `check-reminder.test.ts`: manual-paused reminder fires after the interval measured from `paused_at`; resets after a confirm; hospital-paused tanks never reach the predicate (guarded in the sweep — covered by a pure test asserting the sweep's gate inputs); running-tank behaviour unchanged.
- `tanks.test.ts`: assert `computeRemaining` output for a running tank is byte-identical before/after (no change expected — guard test).
- Live DB checks (via `lovable auth-session` + SQL/RPC): pause→resume accumulates `paused_seconds`; non-member RPC call denied; resuming a hospital-paused tank raises; hospital ON→OFF leaves a manually paused tank paused and resumes a hospital-paused one.
- Full `vitest`, `tsgo --noEmit`, en/sv key parity.
- No package or dependency changes.

## Flags / deviations from the brief

1. **2-arg hospital-mode overload left in place** (see migration notes) — dropping it is a breaking change; the new OFF logic covers its rows via `pause_reason IS NULL`.
2. **Handover prefill needs an extra query** — the existing window query can't see a tank paused before the shift; a tiny active-tank lookup is the clean fix.
3. **Sweep needs `families.timezone` in its select** to format "{HH:MM}" in family tz — one added column, no behaviour change.
4. **`paused_by` → auth.users FK** follows your spec and the existing `created_by` precedent, though it deviates from the general "no auth.users FKs" project rule.
