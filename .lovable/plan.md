# Fix "this occurrence only" edit/cancel (42P10)

## Diagnosis — confirmed as you described

Both override upserts (`useUpdateAppointmentInstance`, `useDeleteAppointmentInstance`) send
`onConflict: "recurrence_parent_id,recurrence_override_at"`. The only matching index is partial:

```
appointments_override_unique_idx ON (recurrence_parent_id, recurrence_override_at)
  WHERE recurrence_parent_id IS NOT NULL AND recurrence_override_at IS NOT NULL
```

PostgREST emits `ON CONFLICT (recurrence_parent_id, recurrence_override_at)` without the WHERE predicate, so Postgres can't infer the partial index. Every call fails, including the first insert:

- code `42P10`
- message `there is no unique or exclusion constraint matching the ON CONFLICT specification`
- details/hint: null

Seen in my API run for both the caregiver and owner upserts.

Supporting evidence: the database has **0 override rows** in total, so no single-occurrence edit or cancel has ever saved.

## Duplicate check

`select recurrence_parent_id, recurrence_override_at, count(*) ... having count(*) > 1` → **empty** (and 0 rows have a parent without `recurrence_override_at`).

## Migration (not applied yet)

```sql
CREATE UNIQUE INDEX appointments_override_key
  ON public.appointments (recurrence_parent_id, recurrence_override_at);

DROP INDEX public.appointments_override_unique_idx;
```

NULLs are distinct, so ordinary tasks (both columns NULL) are unaffected. The sweep's existing `recurrence_parent_id` lookups keep using `appointments_recurrence_parent_idx`.

## No client changes

The upserts already target exactly these two columns.

## Verification in the app (Planner, signed in)

Owner, on own repeating task:
1. "Endast denna" edit
2. Edit the same occurrence again (exercises the conflict update)
3. Cancel it

Each saves, and the Planner shows the change / hides the occurrence.

Caregiver (bilalassistans@gmail.com), on their own series: the same three steps.

Owner re-edits an occurrence the caregiver moved: saves, and `created_by` on that row stays the caregiver's (read back via SQL).

Then delete the test tasks, run full vitest and tsgo, and report.
