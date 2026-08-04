# Lead 5 guidebook sections with purpose

i18n copy only — `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts` (identical line ranges in both). No component or behavior changes.

## 1. Schedule (line ~3405)

Opening body replaced with the purpose sentence ("day-by-day plan... one day at a time... without the noise of Today's live working view").

In "How to use it": the dose step loses the implementation aside and becomes
"Mark a dose Given or Skip. Marking here is quick; for a full log with a reason, use Today."
Move-between-days, add appointment, undo, and the occurrence-vs-series point all stay.

## 2. Settings (line ~3806)

New first block (purpose, no heading): Settings manages your own account plus the family's shared configuration, listing the two parts.
The "Family settings" block's body changes from "These are only shown to the owner." to
"Your-account settings are yours; family settings that affect everyone are managed by the owner."
Step lists unchanged.

## 3. Subscription (line ~3776)

First body becomes the purpose paragraph (trial → active keeps app usable, otherwise read-only with data kept; subscribe, renewal date and price, billing portal).
The owner-only caveat moves to a second body block right after it.
"What it shows", the portal/data note and "After cancelling" unchanged.

## 4. Shopping list (line ~3670)

First body becomes the purpose paragraph (buy list built automatically from Inventory).
Second body becomes the read-only note (tick off and update stock in Inventory / Förråd) plus the two-part split. The detail sentence about quantity vs threshold and supplier link is kept at the end.

## 5. Care team (line ~3710)

First body becomes the purpose paragraph naming the three parts and why profiles matter ("history shows the person, not just the login").

## 6. Shifts (minor, line ~3735)

Opening reworded to lead with purpose: "Shifts shows who is on duty across the week." then the existing grid description.

Swedish is a natural translation of each, same keys, same structure.

## Verification

- `rg -n "so no reason is recorded|only shown to the owner" src/lib/i18n` → no matches
- en/sv key parity script
- `tsgo --noEmit`
