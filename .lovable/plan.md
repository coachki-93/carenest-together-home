# i18n accuracy fixes: Planner no longer creates appointments

## Goal
Update two stale English strings (and their Swedish counterparts) so they no longer tell users to create appointments from the Planner. The Planner now creates care tasks only; appointments are created on the Appointments page.

## Files changed
- `src/lib/i18n/en.ts`
- `src/lib/i18n/sv.ts`

## Diffs

### 1. Guidebook Planner "How to use it" step

`src/lib/i18n/en.ts` (line ~3465):

````text
- "Use the plus button to create an appointment for the day you are looking at.",
+ "Use the plus button to add a care task — like feeding, sleep, or a vitals check — for the day you're looking at. Care tasks appear on Today, where caregivers mark them done, skipped, or postponed. External visits (doctor, therapy, etc.) are added on the Appointments page, not here.",
````

`src/lib/i18n/sv.ts` (line ~3465):

````text
- "Använd plusknappen för att skapa ett besök på den dag du tittar på.",
+ "Använd plusknappen för att lägga till en vårduppgift — som matning, sömn eller en vitalitetskontroll — på den dag du tittar på. Vårduppgifter visas på Idag, där vårdgivare markerar dem som gjorda, hoppade över eller uppskjutna. Externa besök (läkare, terapi med mera) läggs till på sidan Besök, inte här.",
````

### 2. Onboarding medication extra hint

`src/lib/i18n/en.ts` (line ~1207):

````text
- medExtraHint: "You can also schedule appointments and inhalations later from the Planner page.",
+ medExtraHint: "You can also add inhalations and other care tasks later from the Planner, and appointments from the Appointments page.",
````

`src/lib/i18n/sv.ts` (line ~1207):

````text
- medExtraHint: "Du kan också schemalägga besök och inhalationer senare från sidan Planeraren.",
+ medExtraHint: "Du kan också lägga till inhalationer och andra vårduppgifter senare i Planeraren, och besök på sidan Besök.",
````

## Verification
- `rg` confirms neither `en.ts` nor `sv.ts` still says appointments are created on the Planner.
- `tsgo --noEmit` passes.
- i18n key parity check passes (en/sv key counts equal).
