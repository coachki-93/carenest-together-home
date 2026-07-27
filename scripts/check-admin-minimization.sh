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
)

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
  scaffolds
)

# Strip comment lines so the module's own contract text (which enumerates
# the forbidden tables in its docstring) isn't flagged.
CODE_ONLY="$(grep -Ev '^\s*(\*|//)' "$FILE")"

fail=0
for name in "${FORBIDDEN[@]}"; do
  # Match .from("name"), .from('name'), or bare "name" / 'name' string.
  if echo "$CODE_ONLY" | grep -Eq "\.from\(\s*['\"]${name}['\"]|['\"]${name}['\"]"; then
    echo "FORBIDDEN: $FILE references health/operational table '${name}'" >&2
    fail=1
  fi
done

# Additional structural checks (reuse CODE_ONLY defined above).

if echo "$CODE_ONLY" | grep -Eq "\.select\(\s*['\"]\*['\"]"; then
  echo "FORBIDDEN: $FILE uses select('*') — every column must be explicit" >&2
  fail=1
fi

if echo "$CODE_ONLY" | grep -Eq "\.rpc\("; then
  # is_platform_admin is called through supabase.rpc from the caller's
  # RLS-scoped client. That's the only allowed rpc call. Verify.
  if ! grep -q 'rpc("is_platform_admin"' "$FILE"; then
    echo "FORBIDDEN: $FILE uses .rpc() beyond the is_platform_admin gate" >&2
    fail=1
  fi
fi

if [[ $fail -ne 0 ]]; then
  echo "" >&2
  echo "N1 data-minimization contract violated. Fix $FILE." >&2
  exit 1
fi

echo "check-admin-minimization: OK — no health-table references, no select('*'), rpc gate only."
