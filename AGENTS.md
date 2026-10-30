# Project rules

- Task checklists live on the series master (`appointments.checklist`); completions store a snapshot in `checklist_result`, and NULL means "no checklist data", never "unticked". Why: history must survive later edits to the checklist, and overrides don't carry their own copy.
- Guided routine suggestions come from `src/lib/care-needs/routine-templates.ts`. What was created is tracked in `children.care_needs.settings.scaffolds[cap].routines`, separate from the instruction-offer `status`. Why: re-opening the page or resetting suggestions must never duplicate tasks.
- Notification sweeps must page large reads (`fetchAllPages`) and chunk `.in()` lookups (`fetchInChunks`, at most 100 ids). If an override lookup fails, skip those masters for that run. Why: the 1000-row API cap and missing override data would silently drop pushes or push cancelled occurrences.
