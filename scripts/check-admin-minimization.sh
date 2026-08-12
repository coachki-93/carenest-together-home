#!/usr/bin/env bash
# CI guard: admin.functions.ts must never name a health table.
#
# The N1 platform-admin surface is data-minimized BY CONSTRUCTION: the only
# tables it may reference are the metadata allow-list. Any drift here means
# an admin function could return health data, defeating the whole design.
#
# Fails (exit 1) if any forbidden table name appears in src/lib/data/admin.functions.ts.
# Run manually or wire into CI: `bash scripts/check-admin-minimization.sh`.

set -euo pipefail

FILES=(
  "src/lib/data/admin.functions.ts"
  "src/lib/data/billing-admin.functions.ts"
  "src/lib/data/bug-admin.functions.ts"
  "src/lib/data/analytics-admin.functions.ts"
)

# bug_reports is user-submitted support text (never health data) and lives in
# its own module. Only bug-admin.functions.ts may name it.
BUG_TABLE_OWNER="src/lib/data/bug-admin.functions.ts"

# Support diagnostics read notification DELIVERY / DEVICE metadata only — never
# health content. Only analytics-admin.functions.ts may name these two, and the
# allow-list is deliberately narrow: vitals / care_events / handovers /
# appointments stay forbidden in EVERY guarded file (last-active and recent
# send-attempts come from SECURITY DEFINER SQL functions that return only
# timestamps and the pass label).
DIAG_OWNER="src/lib/data/analytics-admin.functions.ts"
DIAG_ALLOWED=(push_subscriptions appointment_notifications)

# rpc() allow-list. Anything else is a violation.
ALLOWED_RPCS=(is_platform_admin family_last_active family_notification_attempts)


for FILE in "${FILES[@]}"; do
  if [[ ! -f "$FILE" ]]; then
    echo "check-admin-minimization: $FILE not found" >&2
    exit 1
  fi
done

# Allow-list (informational — for humans reading this script):
#   families, family_members, profiles, team_accounts,
#   platform_admins, admin_audit_log
#
# Deny-list: every health / operational table in the app. If a new health
# table is added to the schema, add it here.
FORBIDDEN=(
  children
  child
  care_events
  vitals
  medications
  med_logs
  med_doses
  handovers
  handover_notes
  appointments
  oxygen_tanks
  inventory_items
  inventory_transactions
  shopping_list
  shopping_items
  maintenance_items
  maintenance_logs
  care_place_checks
  care_place_checklist_items
  care_place_responses
  tidy_checks
  tidy_checklist_items
  care_instructions
  care_needs
  emergency_info
  shifts
  tasks
  events
  push_subscriptions
  appointment_notifications
  scaffolds
  bug_reports
)

fail=0

for FILE in "${FILES[@]}"; do
  # Strip comment lines so the module's own contract text (which enumerates
  # the forbidden tables in its docstring) isn't flagged.
  CODE_ONLY="$(grep -Ev '^\s*(\*|//)' "$FILE")"

  for name in "${FORBIDDEN[@]}"; do
    if [[ "$name" == "bug_reports" && "$FILE" == "$BUG_TABLE_OWNER" ]]; then
      continue
    fi
    if [[ "$FILE" == "$DIAG_OWNER" ]]; then
      skip=0
      for allowed in "${DIAG_ALLOWED[@]}"; do
        [[ "$name" == "$allowed" ]] && skip=1
      done
      [[ $skip -eq 1 ]] && continue
    fi
    # Match .from("name"), .from('name'), or bare "name" / 'name' string.
    if echo "$CODE_ONLY" | grep -Eq "\.from\(\s*['\"]${name}['\"]|['\"]${name}['\"]"; then
      echo "FORBIDDEN: $FILE references health/operational table '${name}'" >&2
      fail=1
    fi
  done

  if echo "$CODE_ONLY" | grep -Eq "\.select\(\s*['\"]\*['\"]"; then
    echo "FORBIDDEN: $FILE uses select('*') — every column must be explicit" >&2
    fail=1
  fi

  # Only the allow-listed rpc names may be called. is_platform_admin is the
  # gate; family_last_active / family_notification_attempts are read-only
  # SECURITY DEFINER helpers that return timestamps + delivery metadata only.
  while read -r rpcname; do
    [[ -z "$rpcname" ]] && continue
    ok=0
    for allowed in "${ALLOWED_RPCS[@]}"; do
      [[ "$rpcname" == "$allowed" ]] && ok=1
    done
    if [[ $ok -eq 0 ]]; then
      echo "FORBIDDEN: $FILE calls .rpc(\"${rpcname}\") which is not allow-listed" >&2
      fail=1
    fi
  done < <(echo "$CODE_ONLY" | grep -Eo "\.rpc\(\s*['\"][A-Za-z0-9_]+['\"]" | grep -Eo "['\"][A-Za-z0-9_]+['\"]" | tr -d "\"'")

  # A dynamic / non-literal rpc call can't be audited — reject it.
  if echo "$CODE_ONLY" | grep -Eq "\.rpc\(\s*[^'\"]" ; then
    echo "FORBIDDEN: $FILE uses .rpc() with a non-literal name" >&2
    fail=1
  fi
done


if [[ $fail -ne 0 ]]; then
  echo "" >&2
  echo "N1 data-minimization contract violated." >&2
  exit 1
fi

echo "check-admin-minimization: OK — no health-table references, no select('*'), rpc gate only."
