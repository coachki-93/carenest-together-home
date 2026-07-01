## Add quick-reason chips to Skip / Postpone dialog

In `TaskActionDialog.tsx`, when the action is **skip** or **postpone**, render a row of selectable chips above the reason textarea. Tapping one fills the textarea with that preset (and still allows free-text editing). Different presets per action since the situations differ.

### Skip presets
- Not needed right now
- Child asleep
- Child refused
- Already done manually
- At hospital / handled there
- Missed the time window
- Equipment unavailable
- Other (clears field, focuses textarea)

### Postpone presets
- Child asleep — do later
- Currently eating
- Out of the house
- Waiting on supplies
- Caregiver busy
- Doctor said to delay

### UX
- Chips = small pill buttons, same style as the existing vital-context chips already in the file (keeps visual consistency).
- Single-select: tapping a chip replaces the textarea contents with that preset text; tapping the same chip again deselects and clears.
- Reason textarea remains required and editable — chips are a shortcut, not a replacement.
- Track selected chip in local state so the active one is highlighted.

### i18n
Add keys under `taskAction.skipReasons.*` and `taskAction.postponeReasons.*` in both `en.ts` and `sv.ts`, plus a `taskAction.quickReasonLabel` ("Quick reason").

### Scope
Only `src/components/carenest/TaskActionDialog.tsx`, `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`. No DB / no schema change — the free-text `reason` column already stores whatever is submitted.

Do the preset lists above look right, or want me to trim/rename any before I build it?
