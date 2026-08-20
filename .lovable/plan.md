# Stage 3 — Confirm tank, assumed-flow line, interval setting

## 1. `useConfirmTank` mutation (`src/lib/data/oxygen.ts`)

Mirrors the existing mutation pattern (`suppressGlobalError` meta + `invalidate(qc)` on success). Unlike Replace/ChangeFlow it does **not** close/open rows — it only stamps the active tank:

```ts
export function useConfirmTank() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: { tankId: string }) => {
      const { error } = await supabase
        .from("oxygen_tanks")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", input.tankId)
        .is("replaced_at", null);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
```

RLS: the existing family-member UPDATE policy on `oxygen_tanks` covers this (no column restrictions) — no migration.

Reminder reset: Stage 2's sweep computes `lastInteraction = max(started_at, last_checked_at, updated_at)` and compares against the family interval; stamping `last_checked_at = now()` therefore pushes the next reminder a full interval out. The sweep's dedup stamp `check_reminder_sent_at` is older than the new `last_checked_at`, so the "already reminded this interval" branch does not suppress future reminders incorrectly.

## 2. Oxygen page (`src/routes/_authenticated/oxygen.tsx`)

**Assumed-flow line** — under the remaining-time / percent block in `CurrentTankCard`, a calm muted line:

```tsx
<p className="text-xs text-muted-foreground mt-1">
  {t("oxygen.basedOnFlow", { flow: formatFlow(Number(tank.flow_lpm)) })}
</p>
```

("Based on 0.05 l/min" / "Baserat på 0,05 l/min"). No colour, no icon — informational. The existing "Change flow rate" button already sits directly below in the action row, so it reads as the fix-it action.

**Confirm button** — first in the action row, before Change flow / Replace:

```tsx
<Button variant="outline" onClick={confirm} disabled={confirmTank.isPending} className="rounded-full">
  <CheckCircle2 className="size-4" /> {t("oxygen.confirmTank")}
</Button>
```

Handler calls `mutateAsync({ tankId: tank.id })` inside try/catch → `toast.success(t("oxygen.confirmed"))` or `toast.error`. A muted caption under the row shows when it was last confirmed (`oxygen.lastConfirmed` / `oxygen.neverConfirmed`) so the anti-fatigue state is visible.

## 3. Interval setting

There is currently **no UI** for `oxygen_warn_minutes` / `oxygen_critical_minutes` — they're DB-only. So this goes into the owner-only **Settings → Family settings** block (`src/routes/_authenticated/settings.tsx`), as a new card `OxygenCheckSettings.tsx` placed next to `HandoverReminderSettings`, following the `UsesEquipmentSettings` shape.

- Control: a `Select` of hours — 1, 2, 3 (default), 4, 6, 8, 12 h → stored as minutes (60…720). All options are ≥ 30, so the DB CHECK can't be violated; a defensive `Math.max(30, …)` clamp on write.
- New hook `useUpdateOxygenCheckInterval` in `src/lib/data/family.ts`, and `oxygen_check_interval_minutes` added to the `useFamily` select list.
- Card only renders when the family uses oxygen tracking is not gated today, so it renders for owners like the other cards.

## 4. i18n (`en.ts` + `sv.ts`, exact parity)

`oxygen.confirmTank`, `oxygen.confirmed`, `oxygen.lastConfirmed`, `oxygen.neverConfirmed`, `oxygen.basedOnFlow`, plus an `oxygenCheck.*` block (title, subtitle, label, hours option label, saved).

Swedish: "Bekräfta tub", "Tuben bekräftad", "Baserat på {{flow}}", "Påminn om att kontrollera syrgastuben var …".

## Verification

`tsgo --noEmit`, vitest, en/sv key-parity script, a live DB check that Confirm writes `last_checked_at`, and a re-run of the Stage-2 reminder decision against the stamped tank to show it no longer fires.
