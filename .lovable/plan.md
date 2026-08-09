# Summarise handover prefill noise

Read-time formatting only, all in `src/lib/data/handover-prefill.ts` plus two new label keys in `en.ts` / `sv.ts`. No schema changes.

Severity scale confirmed as 1–3 (mild / moderate / severe), so "surface individually" = severity 2 or 3; severity 1 or none can collapse.

## 1. Cluster abnormal vitals by moment

New const `VITAL_CLUSTER_WINDOW_MS = 3 * 60 * 1000` (3 minutes).

- Collect all abnormal readings first (instead of pushing a line each).
- Sort by `logged_at`.
- Walk the list; start a new cluster when a reading is more than the window after the *first* reading of the current cluster.
- Within a cluster, order readings by a fixed vital order (spo2, heart_rate, breathing, temperature, then the rest alphabetically) so lines read the same every shift.
- Emit one line per cluster, timestamped from the cluster's first reading:

```text
• 02:46 Värde utanför normalområdet: SpO₂ 94%, puls 128, andning 64
```

A single abnormal reading naturally renders as a one-vital line. Separate episodes hours apart stay separate lines.

## 2. Summarise repeated care events

Per event type within the shift:

- Noteworthy = non-empty `description`, OR non-empty `action_taken`, OR `severity >= 2`. Always rendered individually via the existing `_formatCareEventLine` (time, severity, duration, description, action).
- The remaining routine events of that type: if 2 or more, one count line; if exactly 1, render it normally (never "×1").

Count line format:

```text
• Kräkning ×3 under passet
```

Ordering: noteworthy lines keep chronological order (query is already ordered ascending); count lines are appended after them, ordered by first occurrence of the type.

## New i18n keys

Under `handoverPage.prefill`:

- `careEventCount` — en: `"{{type}} ×{{count}} {{during}}"`, sv: `"{{type}} ×{{count}} {{during}}"`
- `duringShift` — en: `"during the shift"`, sv: `"under passet"`

Plumbed through the existing `Labels` interface as optional `careEventCount` / `duringShift` fields, wired in `src/routes/_authenticated/handover.tsx` alongside the other prefill labels.

## Preserved

Exception-based philosophy (only abnormal / noteworthy shown, just grouped), family-timezone handling (`formatTimeIn` for care events, `fmtTime` for vitals as today), calm-shift positive meds summary, and every other note source.

## Verification

`tsgo --noEmit`, en/sv key parity, and a pure-logic simulation covering: multi-vital desaturation → one line; 4 routine vomits → `×4 under passet`; 1 flagged vomit + 3 routine → separate line + `×3`; single event of a type → normal line.
