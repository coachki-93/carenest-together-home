## Changes

### 1. Remove language toggle from top header
In `src/components/carenest/DashboardLayout.tsx`, remove the `<LanguageToggle />` block (and its import) from the header actions. The language toggle already exists in the sidebar footer, so users retain access.

### 2. Configurable handover reminder lead time
Currently `src/lib/data/handover-due.ts` hardcodes the reminder to fire 30 minutes before a shift ends. Make this configurable per family.

**Database**
- Add `handover_reminder_minutes` (int, default 30) to the `families` table.

**Data layer**
- Update `useHandoverDueItem` to accept a `leadMinutes` argument instead of the hardcoded 30.

**Dashboard**
- In `src/routes/_authenticated/dashboard.tsx`, read the family's `handover_reminder_minutes` and pass it into the hook.

**Settings**
- In `src/routes/_authenticated/settings.tsx` (family/owner-only section, next to Care-Place and End-of-Shift Tidy settings), add a small form: a number input (5–120 min, step 5) labeled "Handover reminder lead time" that updates `families.handover_reminder_minutes`.

**i18n**
- Add new keys to `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts` for the setting label, help text, and unit ("minutes before shift ends").

### Notes
- The reminder banner logic (30 min default) already matches current behavior — no behavior change for existing families since the default is 30.
- Owner-only visibility follows the same pattern used by other family-scoped settings on that page.
