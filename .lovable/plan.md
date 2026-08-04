# Care instructions: owner-only writes

Care instructions can currently be created, edited and deleted by any family member. They should be owner-only. Reading stays open to every member.

## 1. Database rules (the real enforcement)

Confirmed the three existing write rules exist under exactly these names, so the drops are not silent no-ops:

- `Family members can insert instructions`
- `Family members can update instructions`
- `Family members can delete instructions`

The read rule `Family members can view instructions` is left untouched.

```sql
DROP POLICY "Family members can insert instructions" ON public.care_instructions;
DROP POLICY "Family members can update instructions" ON public.care_instructions;
DROP POLICY "Family members can delete instructions" ON public.care_instructions;

CREATE POLICY "Family owners can insert instructions"
ON public.care_instructions FOR INSERT TO authenticated
WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Family owners can update instructions"
ON public.care_instructions FOR UPDATE TO authenticated
USING (public.is_family_owner(family_id, auth.uid()))
WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Family owners can delete instructions"
ON public.care_instructions FOR DELETE TO authenticated
USING (public.is_family_owner(family_id, auth.uid()));
```

## 2. Interface

`src/routes/_authenticated/instructions.tsx` already loads the current user's membership via `useMyMembership()`. Derive `isOwner` from `membership?.role === "owner"` — the same derivation the billing page uses.

When the viewer is not the owner:

- the "Add instruction" button in the header is hidden
- the empty-state add button is hidden (empty state becomes a plain message)
- the pencil and trash buttons on each instruction card are hidden

Owners keep the full add/edit/delete experience. No text changes, no new keys.

## Verification

- Non-owner: page is read-only, and a forced write is rejected by the database.
- Owner: add, edit and delete all work.
- All members can still read instructions.
- `tsgo --noEmit` clean.
