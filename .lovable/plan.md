# Higher LIV Mini 2 L flows + short-tank safety adjustments

## 1. Duration table (`src/lib/oxygen/tanks.ts`)
Header comment becomes:
```
// LIV Mini 2 L CONOXIA. Linde Homecare pocket table SE 2020-02:
// low-flow selector + standard regulator; durations are for a full tank, rounded down.
```
13 existing rows byte-identical. Append after 0.30:
```ts
  { flow: 0.5, minutes: 13 * 60 + 20 },  // 13 h 20 min
  { flow: 0.75, minutes: 8 * 60 + 45 },  // 8 h 45 min
  { flow: 1.0, minutes: 6 * 60 + 40 },   // 6 h 40 min
  { flow: 3.0, minutes: 2 * 60 + 10 },   // 2 h 10 min
```

## 2. Label
`label: "LIV Mini 2 L CONOXIA"` (id `liv_mini_2l` unchanged, no migration).
`en.ts:2795` / `sv.ts:2794` example strings: `LIV Mini 2 L (lågflödesväljare)` -> `LIV Mini 2 L CONOXIA`.

## 3. Status thresholds (`computeRemaining`)
```ts
const lowAt = total <= 720 ? total / 2 : 720;
const critAt = total <= 120 ? total / 4 : 120;
else if (remaining < critAt) status = "critical";
else if (remaining < lowAt) status = "low";
```
All old flows have total >= 1320 min, so they keep 720/120 exactly. New: 0.5 (800) unchanged; 0.75 (525) low <262.5; 1.0 (400) low <200; 3.0 (130) low <65, crit <120 (130 > 120 so critAt stays 120).

## 4. Check-interval cap (`check-reminder.ts`)
New exported helper `effectiveCheckIntervalMinutes(intervalMinutes, tankTotalMinutes)` = `min(resolveCheckIntervalMinutes(interval), total/2)` when total is a finite number > 0, else the resolved family interval. Optional `tankTotalMinutes` added to both `shouldSendCheckReminder` and `isOxygenCheckOverdue` inputs. Sweep and `OxygenCheckBanner` pass `durationMinutes(tank_type, flow_lpm)`.

## 5. Tests
New `tanks.test.ts` (durations old + new, status parity for old flows, 3.0 ok/low/critical boundaries) and cap cases in `check-reminder.test.ts`.

## Flags (please decide)
- **Your item 3 math for 3.0 l/min:** total 130 > 120, so `critAt` stays 120, not 32.5. That means a *fresh* 3.0 tank already shows "critical" (130 left, crit < 120 after 10 min; and "low" threshold 65 sits below crit). Your expected test ("ok fresh, low <65, critical <32.5") only holds with `critAt = total <= 720 ? total / 4 : 120` (same gate as lowAt). I'll use that unless you object — it still leaves every old flow at exactly 720/120.
- **Push alarms at 3.0:** family defaults warn 60 / crit 20 min are unchanged per your instruction, so the critical push comes at ~20 min left of a 130-min tank. Fine if intended; just noting.
- The cap is not floored at the 30-min minimum; smallest table total is 130 -> 65, so it can't currently go below 30.
