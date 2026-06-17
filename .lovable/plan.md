## Goal
Add a new **Oxygen** page where caregivers track the current oxygen tank (LIV Mini 2 L med lågflödesväljare) and see how long it will last at the chosen flow rate, with a live countdown to "empty".

## How I suggest tackling it

### 1. Hard-code the duration table (no DB needed for the lookup)
The minutes-per-flow values from the bottle's spec sheet don't change — they're a property of the equipment, not user data. I'll store them as a constant in `src/lib/oxygen/tanks.ts`:

```ts
// LIV Mini 2 L med lågflödesväljare
{ flow: 0.01, minutes: 27*1440 }, // 27 d
{ flow: 0.02, minutes: 13*1440 + 12*60 }, // 13 d 12 h
{ flow: 0.03, minutes: 9*1440 },
...
{ flow: 0.20, minutes: 22*60 },
```

Structured so adding more tank types later (e.g. LIV Mini 1.1 L) is just another entry in a `TANKS` record.

### 2. One DB table: `oxygen_tanks`
Tracks the currently-mounted tank per family:
```
id, family_id, tank_type ('liv_mini_2l'), flow_lpm numeric,
started_at timestamptz, replaced_at timestamptz null, notes,
created_at, created_by
```
RLS: family members read/insert/update their own family's rows. Standard grants.

Only one "active" tank per family at a time (active = `replaced_at is null`). Replacing the tank inserts a new row and stamps the old one's `replaced_at`.

### 3. The Oxygen page (`/oxygen`)
Layout:
- **Top card — Current tank**
  - Big remaining-time readout ("4 d 6 h left") computed live from `started_at + duration(flow) − now`.
  - Progress bar (% used).
  - Estimated empty date/time.
  - "Low" warning color when < 12 h left, "critical" when < 2 h.
  - Shows current flow setting and tank type.
- **Actions**
  - **Change flow rate** — dropdown of the 13 supported settings (0.01–0.30 l/min). Saving updates `flow_lpm` and recomputes — but since changing flow mid-tank invalidates a simple `started_at + duration` calc, see note below.
  - **Replace tank** — closes the current tank, opens a new one with `started_at = now` and the last flow.
- **History** — collapsible list of past tanks (started, replaced, flow used).
- Empty state when no tank logged yet → "Start tracking" button.

### 4. Flow-changes mid-tank (the one tricky bit)
A flow change resets the simple formula. Two options:
- **A. Simple (recommended for v1):** treat each flow change as "replace tank, carry over estimated remaining". When the user changes flow, we compute current % remaining at the old flow, close the old row, open a new row with `started_at` back-dated so the remaining time at the new flow matches.
- **B. Exact:** add an `oxygen_flow_changes` child table logging every flow segment, sum consumption across segments. More accurate but more schema and UI.

I'd go with **A** for v1 — one table, accurate enough, easy to reason about.

### 5. Bilingual (EN + SV)
All strings go through `t()` with new keys under `oxygen.*` in both `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts` (Oxygen, Current tank, Flow rate, Replace tank, Time remaining, Estimated empty, Low, Critical, History, etc.).

### 6. Nav + page header
- Add an "Oxygen" entry to `AppSidebar` (with a `Wind` or `Droplet` icon).
- Include `<LanguageToggle />` in the page header per project rules.

## Files touched
- New: `src/routes/_authenticated/oxygen.tsx`
- New: `src/lib/oxygen/tanks.ts` (duration table + helpers: `durationMinutes(flow)`, `remainingMinutes(tank, now)`, `formatDuration(min)`)
- New: `src/lib/data/oxygen.ts` (React Query hooks: `useActiveOxygenTank`, `useOxygenHistory`, `useStartTank`, `useChangeFlow`, `useReplaceTank`)
- New migration: `oxygen_tanks` table + RLS + grants
- Edited: `src/components/carenest/AppSidebar.tsx` (nav entry)
- Edited: `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`

## Out of scope for v1
- Push notification when tank is about to run out (easy follow-up using the existing push pipeline).
- Multiple tank types / second bottle in reserve.
- Per-segment exact accounting (option B above).

Approve and I'll build it. Want me to also wire up a **push notification when < 6 h remaining** in this same pass, or save that for a follow-up?