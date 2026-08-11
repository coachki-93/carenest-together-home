# Two copy fixes (i18n only)

## 1. Swedish typo
`sv.ts:3469` — "sövn" → "sömn".

## 2. Founding-price deadline
Match the pricing card's phrasing ("before 31 Dec 2026" / "före 31 dec 2026").

| key | en | sv |
| --- | --- | --- |
| `marketing.pricing.sub` (2199/2198) | "Founding families who start before 31 Dec 2026 lock in 199 kr/month for life." | "Grundarfamiljer som börjar före 31 dec 2026 låser priset 199 kr/månad för alltid." |
| `p8` (2398/2397) | "Founding families who start before 31 Dec 2026 lock in 199 kr/month for life; ..." | "Grundarfamiljer som börjar före 31 dec 2026 låser 199 kr/månad för alltid; ..." |
| `q2A` (2435/2434) | "... 199 kr/month for founding families who join before 31 Dec 2026 — locked for life — ..." | "... 199 kr/månad för grundarfamiljer som ansluter före 31 dec 2026 — låst för alltid — ..." |
| `foundingLocked` (3196) | "Founding rate — locked for life, started before 31 Dec 2026." | "Grundarpris — låst för alltid, startat före 31 dec 2026." |

Legal text (3341) already names the deadline; unchanged.

## Verify
en/sv parity, tsgo --noEmit, no "for life" claim without the deadline.
