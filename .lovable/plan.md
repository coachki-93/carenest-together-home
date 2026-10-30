# Guided routine setup from care needs

## Blocker: the catalog file is missing
`claude/routine-catalog-draft.md` is not in the project, and no file named like it exists. Only the Trakeostomi rows and Lägesändring are spelled out in your message. Please upload or paste the catalog. Until then I can build the engine and the trach + Lägesändring templates. Every other row waits on the catalog.

## Answers
- **Who sees the page: owner only.** child.tsx sets `canEdit = role === "owner"`, and the database only lets the owner update a child. Caregivers get a "only the owner can set up routines" message. Creating tasks is open to any member, but saving progress on the care needs (the duplicate guard) isn't.
- **Existing task offers** (feed_task for g_tube/nj_tube, neb_task for inhalations, glucose_task for diabetes): the new page replaces them. I'll remove them from the dashboard card so each routine has one way to be created. Their catalog equivalents become templates. Tasks already created from the old offers aren't tracked, so the new page can't detect them (see conflict 3).
- **neb_task flag:** it creates `kind = "medication"` tasks in the planner, outside the Medications module, so they skip dose logging and stock. I'm leaving it as is; when it's retired, its catalog row should be `medication_link` or a plain task.
- **Default `reminder_minutes`:** null (off) for every new template. Turning reminders on stays a per-task choice in the planner.

## Conflicts to decide
1. **Push flood is not controlled by reminders.** Every task occurrence gets a START push, plus a MISSED push if it isn't done within `missed_after_minutes` (default 15). `reminder_minutes = null` only turns off the early reminder. Lägesändring at 9 times a day means about 9 start pushes a day, and up to 9 missed pushes, including at 00:00 and 04:00. There's no per-task off switch today. Options:
   a. Accept it, and give multi-time templates a long missed window (e.g. 90 min) so only real misses are pushed. No database change.
   b. **Add `appointments.notify_start boolean NOT NULL DEFAULT true`** and have the sweep skip START when false. Templates with more than 3 times a day set it false. One small additive column; existing tasks keep today's behaviour.
   I recommend **b**, and it's the only migration I'd propose. `template_key` isn't needed, because ids are stored in care-needs settings.
2. **"Mark the need done" would also hide its instruction offers.** The scaffold status today is one value per capability, and it also drives the instruction offers on the dashboard card. Marking it done after routines are saved would silently drop "save trach-care instructions". Proposal: keep `status` for the card's instruction offers as now, and add separate fields for routines, backwards-compatible:
   `scaffolds[cap] = { status?, until?, routines?: { status: "done" | "dismissed", created: { [templateKey]: appointmentId } } }`
   Old entries with only `status` read exactly as before. The reminder card uses `routines` (no status → show "Set up routines for X →"), and the instruction offers keep using `status`.
3. **Duplicates with old offer tasks:** tasks made through the old feed/neb/glucose offers have no record. A family that already used them will see the feeding suggestion again, but it starts unticked whenever the child already has a planner task of the same kind. That last part is a heuristic; tell me if you'd rather skip it.
4. **"Show setup suggestions again"** (clearAllScaffolds) would wipe the `created` record and allow duplicates. Proposal: it clears `status` and `routines.status` only, and keeps `routines.created`.

## Flow
- **New page `/routines?child=<id>&needs=a,b`** (only the given needs, or all of the child's needs with templates if omitted). It's titled "Föreslagna rutiner" / "Suggested routines" and starts with the note "Förslag – följ alltid ert vårdteams ordination." / "Suggestions – always follow your care team's plan."
- **Onboarding:** the final step goes to `/routines?child=…` instead of the dashboard. If the child has no needs with templates, it goes straight to the dashboard (with the tour), as today.
- **Child page:** after saving, newly added needs that have templates and no `routines.status` open `/routines?child=…&needs=<new>`.
- **Grouped by need,** each suggestion row has:
  - a checkbox
  - the title (editable)
  - repeat: freq select + interval
  - times of day
  - a ChecklistEditor
  - `medication_link` rows show "Set up in Medications →" and never create anything.
- **Validation:** a ticked task without a time is marked inline ("Lägg till minst en tid") and blocks saving.
- **"Lägg till valda"** creates one appointment per ticked row. Already-created rows show "Tillagd" (disabled). Then it writes `routines.created` and `routines.status`, and goes to Today. A need with nothing ticked and nothing created becomes `dismissed`; otherwise `done`.
- **Skip button:** marks every shown need `dismissed` and goes to Today.

## Template model (`src/lib/care-needs/routine-templates.ts`)
```ts
type RoutineTemplate = {
  key: string;            // "trach_care"
  capability: string;     // "tracheostomy"
  target: "task" | "medication_link";
  kind: AppointmentKind;
  titleKey: string;       // routines.templates.trach_care.title
  stepKeys: string[];     // routines.templates.trach_care.steps.clean_stoma …
  freq: "hourly" | "daily" | "weekly" | "monthly";
  interval: number;
  timesOfDay: string[];   // ☐ rows: []
  defaultSelected: boolean;
  requiresTimes: boolean;
};
```
Pure mapper `templateToAppointment(t, edits, { familyId, childId, userId, tz, today, t })` returns the insert payload:
- The anchor `starts_at` is `zonedWallClockToDate(today, firstTime, tz)`.
- `recurrence_times_of_day` holds the times, and `recurrence_interval` the interval.
- Checklist ids come from `crypto.randomUUID()`, with labels in the creating user's language.
- `reminder_minutes: null`, `late_after_minutes: 0`, `missed_after_minutes: 15` (or the conflict 1 values).

Templates known now:
- **Trakeostomi:**
  - "Trakomläggning": daily 08:00, ticked. Steps: Rengör stoma, Byt trakkompress, Byt trakband, Byt fuktfilter (HME).
  - "Kontroll av akutväska": ticked. The time comes from the catalog.
  - "Kanylbyte": not ticked, no times.
- **Lägesändring:** daily at 08, 10, 12, 14, 16, 18, 20, 00, 04. Which capability it belongs to (sleep_positioning?) comes from the catalog.

## i18n
New `routines.*` block with exact en/sv parity. Natural Swedish titles and steps.

## Tests
- `routine-templates.test.ts`: the mapper uses Stockholm 08:00 in winter and summer, and a non-Stockholm timezone. It also covers times, interval and freq, new unique checklist ids, the "no time → invalid" rule and `medication_link → null`.
- `scaffold-status.test.ts`: old entries still parse, `routines` merges, and created records survive a reset.

## Verification
- New test account: onboarding with Trakeostomi + Gastrostomi → suggestions → accept → tasks show on Today with checklists.
- Add Diabetes later on the child page → only diabetes suggestions show.
- Open the page again → "Tillagd" and no duplicates.
- Full vitest, tsgo, en/sv parity.

## Needed from you
1. The routine catalog.
2. Option a or b for conflict 1.
3. Approval of the split routines status (conflict 2) and the reset behaviour (conflict 4).
