# Roadmap

## Done: Manual "pause oxygen at home" feature
- [x] Migration: pause_reason/paused_by/paused_caregiver_profile_id + backfill, set_oxygen_tank_paused RPC, 3-arg set_family_hospital_mode updated, legacy 2-arg overload dropped
- [x] types.ts regenerated — single hospital-mode signature confirmed; pg_proc shows only (uuid, boolean, jsonb)
- [x] Sweep: "still paused?" reminder for manually paused tanks (shouldNagManualPause gate)
- [x] Oxygen page: Pause/Resume UI + hooks, pauser attribution
- [x] Today banner: persistent neutral paused banner, amber + "Still off" when overdue
- [x] Handover prefill: "Oxygen paused since" line
- [x] Dashboard oxygen card: manual pause no longer shows red hospital copy
- [x] i18n en+sv parity (2879 keys each)
- [x] Tests: 158 passed; live DB checks all passed (pause/resume accumulation, unauthenticated + non-member denied, hospital-resume refused, manual pause survives hospital ON/OFF, owner-only hospital toggle)
- [x] tsgo --noEmit clean, build OK
