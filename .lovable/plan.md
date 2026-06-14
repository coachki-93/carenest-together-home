## The problem

A caregiver account like "Kommunen" isn't a person — it's the organisation that the actual caregivers (vårdprofiler) work under. Right now we show the account holder's name everywhere a "person" appears (Care team list, Shifts row labels, who completed a task). We need to flip that: the account is just a container, and the profiles under it are the human-level identity used across the app.

## What changes

### 1. Caregivers page (`/caregivers`)
- Rename the "Members" section to "Caregiver organisations" (and call each row an "account", not a person). Show the account name once, with a small count badge like "3 vårdprofiler".
- Move the "Vårdprofiler" section to the top and make it the primary list — grouped by the organisation they belong to.
- Owner gets full management: add / edit / remove profiles for any caregiver account (not just their own).
- Caregiver account holder still manages only their own profiles.

### 2. Onboarding for a new caregiver account
- After accepting an invite, the first screen now asks for the **organisation name** (e.g. "Kommunen") and then immediately walks them to "Add your first vårdprofil" (name + color). Skipping the profile step is allowed but a banner reminds them no shifts/logs can be attributed until at least one profile exists.

### 3. Shifts (`/shifts`)
- Rows in the weekly grid become **caregiver profiles**, not member accounts. The profile's color drives the avatar/shift colour.
- The shift dialog's "Caregiver" selector becomes a **vårdprofil** selector, grouped by organisation.
- `caregiver_shifts.caregiver_user_id` stays for back-compat but the UI reads/writes `caregiver_profile_id`. Existing rows without a profile are listed under an "Unassigned" row the owner can re-assign.

### 4. Schedule, dashboard, handover, med logs
- Wherever we currently render a caregiver name/avatar from `family_members` + `profiles`, swap to the linked `caregiver_profile` (name + color). Fallback to the organisation name only when no profile is linked (legacy rows).
- "Who completed" chips on med logs, handovers, and task feed all show profile name + color dot.

### 5. Sidebar / header
- The profile chip in the top-right for a caregiver account shows: organisation name as the main label, with "Acting as: {profileName} ▾" underneath — clicking opens a profile switcher so the caregiver picks which vårdprofil they're currently logged actions as. Selection is persisted (localStorage) and used as the default for `caregiver_profile_id` on new med logs / handovers (overriding the time-based suggestion only when the user picks one).

## Technical notes

- No schema changes needed — `caregiver_profiles`, and the `*_caregiver_profile_id` columns on `caregiver_shifts`, `med_logs`, `handovers` already exist.
- New helper `useActiveCaregiverProfile()` (returns selected profile from localStorage, falling back to `suggest_caregiver_profile`).
- RLS update: `caregiver_profiles` insert/update/delete policy needs to also allow `is_family_owner(...)`, not just the owning account, so owners can manage org profiles.
- Shifts page row data switches from `useFamilyMembers` to `useCaregiverProfiles`; `expandShifts` keeps using `caregiver_user_id` internally for legacy rows but exposes `caregiverProfileId` too.

## Out of scope (for this change)

- Removing `caregiver_user_id` from `caregiver_shifts` (kept for legacy data).
- Per-profile login credentials (the org account is still the single login).
- Reporting/analytics per profile.

## Confirm before I build

Sound right? Two quick decisions I'd like to lock in:
1. **Owners managing profiles** — should the family owner be able to add/rename/remove vårdprofiler for a caregiver organisation, or only the caregiver account holder?
2. **Profile switcher placement** — top-right "Acting as" dropdown (my proposal) vs. a one-time picker per session vs. a picker shown only when completing a task. I'd default to top-right because it makes the current identity obvious.
