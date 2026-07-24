# Handover reminder + editing — revised plan (v2)

Repo check applied: `handovers` has an existing `Authors can update their handovers` UPDATE policy (no time gate) and a `handovers_set_updated_at` BEFORE UPDATE trigger. Real columns: `shift` (not `shift_label`), `shift_start`, `shift_end`, `summary`, `sleep`, `mood`, `seizures`, `fluids`, `meds`, `notes`, `edited_at`.

---

## Decisions per your corrections

### 1. UPDATE policy approach — **tighten the existing policy** (do not add a second)

Alter the existing policy in place to add the server-side time gate. This keeps a single UPDATE policy on the table (no overlap), keeps the `updated_at` trigger, and blocks direct client UPDATEs after the window. The RPC is `SECURITY DEFINER` and does its own author + window check, so the policy is belt-and-braces.

Diff:

```sql
-- Replace the broad update policy with a time-gated one.
DROP POLICY "Authors can update their handovers" ON public.handovers;

CREATE POLICY "Authors can update their handovers within window"
  ON public.handovers
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND private.is_family_member(family_id, auth.uid())
    AND created_at > now() - interval '2 hours'
  )
  WITH CHECK (
    author_id = auth.uid()
    AND private.is_family_member(family_id, auth.uid())
    AND created_at > now() - interval '2 hours'
  );
```

DELETE policy and `handovers_set_updated_at` trigger untouched.

**Why tighten rather than REVOKE:** the client currently issues no direct UPDATEs (all edits will go through the RPC), so functionally either works. Tightening is safer if any future code path forgets and calls `.update()` directly — it still gets blocked after 2h. REVOKE would also break the trigger-free path future code might legitimately want. Tightening wins on defense-in-depth.

### 2. Edit window — **2h constant, defined once, mirrored in UI**

Single source of truth: `HANDOVER_EDIT_WINDOW_MINUTES = 120` exported from `src/lib/data/handovers.ts`. The RPC hardcodes `interval '2 hours'` and the UI gate calls `canEditHandover(h, uid, now)` which uses the exported constant. Both are literals; a code review diff of one place is required to change either. A comment on the constant flags "must equal the RPC's interval." (Not derivable from the DB without a round-trip; keeping it a plain constant.)

UI gate is cosmetic — hides/disables the Edit button; server RPC + policy are the real enforcement.

### 3. Atomic RPC (`edit_handover`) — re-checks author + window internally

`SECURITY DEFINER` → RLS bypassed → RPC MUST enforce author + window itself. Confirmed in the SQL below (`RAISE EXCEPTION` on either violation, before any write). Reads-delete runs inside the same function after the UPDATE, so no half-apply.

After the reads-delete + query invalidation:
- `useHandoverReadsBulk` refetches → other viewers' `isUnreadForViewer` re-evaluates against the new empty reads array AND the fresh `edited_at`, both routes give unread=true.
- `HandoverUnreadBanner` recomputes because it already keys off `edited_at` and reads.
- Author's own view: their receipt is also deleted; the card's "read by" pill goes back to empty. Acceptable — author knows they just edited.

---

## Migration (RPC + policy tighten)

```sql
-- 1) Tighten existing UPDATE policy to add server-side 2h window.
DROP POLICY "Authors can update their handovers" ON public.handovers;

CREATE POLICY "Authors can update their handovers within window"
  ON public.handovers
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND private.is_family_member(family_id, auth.uid())
    AND created_at > now() - interval '2 hours'
  )
  WITH CHECK (
    author_id = auth.uid()
    AND private.is_family_member(family_id, auth.uid())
    AND created_at > now() - interval '2 hours'
  );

-- 2) Atomic edit RPC.
CREATE OR REPLACE FUNCTION public.edit_handover(
  _id uuid,
  _shift public.shift_label,
  _shift_start timestamptz,
  _shift_end timestamptz,
  _summary text,
  _sleep text,
  _mood text,
  _seizures text,
  _fluids text,
  _meds text,
  _notes text
)
RETURNS public.handovers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.handovers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM public.handovers WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Handover not found'; END IF;
  IF v_row.author_id <> v_uid THEN RAISE EXCEPTION 'Not the author'; END IF;
  IF v_row.created_at <= now() - interval '2 hours' THEN
    RAISE EXCEPTION 'Edit window closed';
  END IF;

  UPDATE public.handovers
    SET shift = _shift,
        shift_start = _shift_start,
        shift_end = _shift_end,
        summary = _summary,
        sleep = _sleep,
        mood = _mood,
        seizures = _seizures,
        fluids = _fluids,
        meds = _meds,
        notes = _notes,
        edited_at = now()
    WHERE id = _id
    RETURNING * INTO v_row;
  -- updated_at is bumped by the existing handovers_set_updated_at trigger.

  -- Reset read receipts so every viewer (incl. those who already read)
  -- gets re-prompted on the new content.
  DELETE FROM public.handover_reads WHERE handover_id = _id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_handover(uuid, public.shift_label, timestamptz, timestamptz, text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.edit_handover(uuid, public.shift_label, timestamptz, timestamptz, text, text, text, text, text, text, text) TO authenticated;
```

Notes:
- `author_id`, `caregiver_profile_id`, `family_id`, `child_id`, `created_at` intentionally not touched — attribution preserved.
- The RPC signature matches every field the current create dialog writes; no schema changes.

---

## Client work (after migration approved)

- `src/lib/data/handovers.ts`: export `HANDOVER_EDIT_WINDOW_MINUTES = 120`, `canEditHandover(h, uid, now)`, `useEditHandover()` calling `supabase.rpc('edit_handover', {...})`; invalidates `handovers`, `handovers-latest`, `handover-reads`.
- `src/lib/data/handover-due.ts`: add `latestHandover: { created_at; shift_start; shift_end } | null` arg. A candidate window `[at, until)` is "covered" iff a latest handover exists whose `shift_start` (fallback `created_at`) lies within `[at - 60min, until)` in family-tz. Hook returns `{ ...item, covered }` instead of `null`, so the dashboard can pick state (a) vs (b).
- Dashboard: soft banner variant when `covered`, deep-linking to `/handover?edit={latest.id}`.
- `src/routes/_authenticated/handover.tsx`: accept `?edit=` param; if editable → open dialog prefilled → save via `useEditHandover`. Author but expired → disabled button + `editLocked` tooltip. Non-author → no Edit control. Show "redigerad {HH:mm}" marker (family-tz) on cards with `edited_at`.
- i18n en/sv: `handoverReminder.softTitle`, `softBody`, `softAction`, `editedMarker`, `editLocked`.

---

## Verification plan (must pass before I say done)

- `bunx tsgo --noEmit` clean.
- (a) **Author within 2h, via UI**: edit succeeds, `edited_at` set, `handover_reads` for that id empty, second caregiver's unread banner reappears.
- (b) **Author after 2h, via direct API** (the important one): using a Playwright-authenticated browser session, `await supabase.rpc('edit_handover', {...})` on a hand-picked >2h-old handover → expect `Edit window closed`. Then `await supabase.from('handovers').update({...}).eq('id', ...)` on the same row → expect an RLS/permission error (0 rows updated). Log both responses in the summary.
- (c) **Non-author RPC call**: signed in as a different family member → `Not the author`.
- (d) **Banner**: with reminder time active and no handover → write reminder shows; write a handover → banner switches to soft final-notes; edit + save → banner still soft (still covered); manual dismiss → hidden until next window.

---

Ready for approval on the migration above; I'll apply it, then build.
