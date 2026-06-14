## Goal

Ship the remaining caregiver/invite redesign in one coherent change.

## 1. Email invites (replace link-only flow)

- Add `invited_email` (text, optional) to `invites`. Owner enters an email when creating an invite.
- Auth email infra: scaffold the shared Lovable email infrastructure + a transactional template `family_invite` (default Lovable sender, no custom domain).
- New server fn `sendFamilyInvite({ email })`: verifies caller is family `owner`, creates the invite row (still has `code` for the accept link), enqueues the email with a link to `/invite/{code}`.
- Owner UI: in `caregivers.tsx`, swap the "copy link" panel for an email input + "Send invitation" button. Show pending invites with status + resend.
- Invite accept page unchanged; still uses `accept_invite` RPC and forces `caregiver` role.

## 2. Multiple caregiver profiles per account

- New table `caregiver_profiles`:
  - `id`, `family_id`, `account_user_id` (the caregiver login that owns it), `name`, `color`, `avatar_url`, `is_active`, timestamps.
  - RLS: family members can `SELECT`; the owning caregiver account can `INSERT/UPDATE/DELETE` their own; owner can also manage.
- Onboarding for caregiver account: after accepting invite, prompt to create the first profile (name/color). New "Caregiver profiles" section on `/caregivers` lets the caregiver add/edit/remove their own profiles. Owner sees all profiles read-only.
- Task completion (med_logs, handovers, etc.) gets a `caregiver_profile_id` column. UI: when a caregiver account completes a task, show a profile picker (defaulting to the suggested one — see §3). Display the profile's name/color on logs.

## 3. Smart caregiver suggestion

- Use existing `caregiver_shifts` (start/end + caregiver_profile_id once linked).
- Helper `suggestCaregiverProfile(familyId, at = now())`:
  - Returns the profile currently on shift (start ≤ now ≤ end).
  - Tie-break: longest remaining shift.
  - Falls back to the account's most-recently-used profile.
- Used as the default in the task-completion picker; user can override.

## 4. Lock owner-only settings for caregivers

Settings caregivers can read but never write:
- Child profile & medical info (`children`)
- Medications list (add/remove/dose) — `medications` table; `med_logs` still writable
- Schedule / shift structure (`caregiver_shifts`)
- Family members & invites (`family_members`, `invites`)

Enforcement:
- Tighten RLS: `INSERT/UPDATE/DELETE` on those tables requires `is_family_owner(family_id, auth.uid())`. `SELECT` stays open to family members.
- Client UX: hide/disable owner-only buttons for caregiver accounts using `membership.role`.

## Technical notes

```text
invites             + invited_email text null
caregiver_profiles  NEW (family_id, account_user_id, name, color, avatar_url, is_active)
med_logs            + caregiver_profile_id uuid null → caregiver_profiles(id)
handovers           + caregiver_profile_id uuid null
```

Server fns (all `requireSupabaseAuth`):
- `sendFamilyInvite({ email })` — owner only
- `listCaregiverProfiles({ familyId })`
- `suggestCaregiverProfile({ familyId })` — returns `{ profileId, reason }`

Email: use `email_domain--scaffold_auth_email_templates` only if user wants auth email customization later — for now, transactional invite uses the shared infra + a single template. If no email domain exists yet, we'll show the email setup dialog first.

## Out of scope

- Caregiver profile photos beyond a color avatar (can add later)
- Multi-family caregivers (one account, many families) — keep single membership for now
- Push/SMS invites
