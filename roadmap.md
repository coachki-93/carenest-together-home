# Roadmap

## In progress: Manual "pause oxygen at home" feature
- [ ] Migration: oxygen_tanks pause_reason/paused_by/paused_caregiver_profile_id + backfill, set_oxygen_tank_paused RPC, update 3-arg set_family_hospital_mode, DROP legacy 2-arg overload (approved change)
- [ ] Regenerate types.ts; confirm 2-arg union member gone
- [ ] Sweep: "still paused?" reminder for manually paused tanks
- [ ] Oxygen page: Pause/Resume UI + usePauseTank/useResumeTank hooks
- [ ] Today banner: persistent paused banner, amber when overdue
- [ ] Handover prefill: "Oxygen paused since" line
- [ ] i18n en+sv parity
- [ ] Tests: check-reminder, tanks guard, live DB checks (pause/resume, non-member denied, hospital-resume error, hospital ON/OFF vs manual pause, owner-only hospital toggle)
- [ ] Full vitest, tsgo --noEmit, en/sv parity
