# Plan: Stage 1 — Oxygen periodic confirmation migration

Add the three database columns that a future periodic "confirm the tank" reminder will use. No application code, sweep logic, or UI in this stage.

## Migration

**Tables touched:** `families`, `oxygen_tanks`

**Columns:**
- `families.oxygen_check_interval_minutes` — integer, NOT NULL, default 180, with CHECK >= 30. This is the per-family cadence for the safety reminder.
- `oxygen_tanks.last_checked_at` — timestamptz, nullable. When a caregiver last confirmed the tank/flow/level.
- `oxygen_tanks.check_reminder_sent_at` — timestamptz, nullable. Dedup stamp so the reminder fires once per interval, not once per sweep.

## SQL (before application)

```sql
-- Per-family cadence for the periodic "confirm the tank" reminder.
ALTER TABLE public.families
  ADD COLUMN oxygen_check_interval_minutes integer NOT NULL DEFAULT 180
  CONSTRAINT oxygen_check_interval_minutes_check CHECK (oxygen_check_interval_minutes >= 30);

-- When a caregiver last confirmed the active tank.
ALTER TABLE public.oxygen_tanks
  ADD COLUMN last_checked_at timestamp with time zone;

-- Dedup stamp for the last reminder sent (once per interval).
ALTER TABLE public.oxygen_tanks
  ADD COLUMN check_reminder_sent_at timestamp with time zone;
```

## RLS confirmation

No RLS or policy changes are required. `families` and `oxygen_tanks` already have policies that operate on the whole row (family membership / ownership). New columns are covered automatically by existing SELECT/INSERT/UPDATE policies.

## Verification checklist

- [ ] Migration applies cleanly.
- [ ] The three columns exist with the correct types, default, and CHECK.
- [ ] Existing rows remain valid (no backfill required).
- [ ] RLS policies on both tables remain intact.
- [ ] `tsgo --noEmit` passes (no TypeScript source changes are expected, but the generated types should refresh automatically via the integration).
