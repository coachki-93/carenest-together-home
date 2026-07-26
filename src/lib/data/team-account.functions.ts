import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Team-account admin server functions (Phase 5.4).
 *
 * Security model:
 *  - Every entry point uses requireSupabaseAuth and re-verifies the caller
 *    is the family owner via context.supabase (RLS-scoped) BEFORE escalating
 *    to supabaseAdmin. supabaseAdmin is dynamically imported inside the
 *    handler so the server-only module never enters the client bundle.
 *  - The synthetic email uses a single constant so we can swap the domain
 *    if Supabase's validator rejects `.local`.
 *  - Passwords are generated server-side, returned exactly once from
 *    createTeamAccount / resetTeamAccountPassword, and never persisted or
 *    returned by getTeamAccountCredentials.
 *  - Revocation: updateUserById({password}) invalidates refresh tokens; old
 *    password is immediately dead for new logins and existing sessions
 *    evict at next refresh (≤1h). Documented in owner-facing UI copy.
 */

// Single constant so a domain swap is one line if `.local` is rejected on
// first mint. If Supabase's email validator rejects `.local`, change this
// to "team.carenest.app" and report.
const SYNTHETIC_EMAIL_DOMAIN = "team.carenest.local";

const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const PASSWORD_LENGTH = 20;

function slugifyFamilyName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX - 5); // leave room for -XXXX suffix
  return slug || "team";
}

function randomSuffix(len = 4): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function generatePassword(): string {
  // Readable but strong: 20 chars from an unambiguous alphabet.
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++)
    out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function usernameToEmail(username: string): string {
  return `${username}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Verifies caller is the owner of `familyId` using the caller's RLS-scoped
 * client. Throws on any failure. Returns the families.name for slugging.
 */
async function assertCallerIsOwner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  familyId: string,
): Promise<{ name: string }> {

  const { data, error } = await supabase
    .from("families")
    .select("id, name, owner_id")
    .eq("id", familyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Family not found");
  if (data.owner_id !== userId) throw new Error("Forbidden: owner only");
  return { name: data.name ?? "team" };
}

interface CreateTeamAccountInput {
  familyId: string;
}

interface CreateTeamAccountResult {
  username: string;
  password: string; // returned exactly once
  syntheticEmail: string;
}

export const createTeamAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateTeamAccountInput) => {
    if (!input?.familyId || typeof input.familyId !== "string")
      throw new Error("familyId required");
    return input;
  })
  .handler(async ({ data, context }): Promise<CreateTeamAccountResult> => {
    const { supabase, userId } = context;
    const { name } = await assertCallerIsOwner(supabase, userId, data.familyId);

    // Reject if a team account already exists for this family (single-family binding).
    const { data: existing, error: existingErr } = await supabase
      .from("team_accounts")
      .select("family_id")
      .eq("family_id", data.familyId)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (existing) throw new Error("Team account already exists for this family");

    // Escalate: admin client only reached after owner verification succeeded.
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Allocate a unique username (base slug + random suffix, retry on collision).
    const base = slugifyFamilyName(name);
    let username = "";
    let syntheticEmail = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = `${base}-${randomSuffix()}`.slice(0, USERNAME_MAX);
      if (candidate.length < USERNAME_MIN) continue;
      const { data: taken, error: takenErr } = await supabaseAdmin
        .from("team_accounts")
        .select("username")
        .eq("username", candidate)
        .maybeSingle();
      if (takenErr) throw new Error(takenErr.message);
      if (!taken) {
        username = candidate;
        syntheticEmail = usernameToEmail(candidate);
        break;
      }
    }
    if (!username) throw new Error("Could not allocate username");

    const password = generatePassword();

    // (A) Create the auth user.
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: { team_account: true, family_id: data.familyId },
      });
    if (createErr || !created?.user) {
      throw new Error(
        `Failed to create auth user: ${createErr?.message ?? "unknown"}`,
      );
    }
    const newUserId = created.user.id;

    // (G) Insert team_accounts row — this satisfies the RESTRICTIVE guard's
    // precondition so the family_members insert can pass. Ordering matters.
    const { error: taErr } = await supabaseAdmin.from("team_accounts").insert({
      family_id: data.familyId,
      user_id: newUserId,
      username,
      synthetic_email: syntheticEmail,
      created_by: userId,
    });
    if (taErr) {
      // Rollback (A): delete the auth user so no orphaned account exists.
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(`Failed to link team account: ${taErr.message}`);
    }

    // (H) Insert family_members row binding the team account to this family.
    const { error: fmErr } = await supabaseAdmin.from("family_members").insert({
      family_id: data.familyId,
      user_id: newUserId,
      role: "caregiver",
    });
    if (fmErr) {
      // Rollback (G) + (A). If either rollback fails we still surface the
      // primary error but leak nothing to the caller — the team_accounts
      // row is gone (or absent) so no future function-call path returns
      // success with the family_members row missing.
      try {
        await supabaseAdmin
          .from("team_accounts")
          .delete()
          .eq("family_id", data.familyId);
      } catch { /* best-effort rollback */ }
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});

      throw new Error(`Failed to bind membership: ${fmErr.message}`);
    }

    return { username, password, syntheticEmail };
  });

interface ResetTeamAccountPasswordInput {
  familyId: string;
}

interface ResetTeamAccountPasswordResult {
  username: string;
  password: string; // returned exactly once
}

export const resetTeamAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ResetTeamAccountPasswordInput) => {
    if (!input?.familyId || typeof input.familyId !== "string")
      throw new Error("familyId required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ResetTeamAccountPasswordResult> => {
    const { supabase, userId } = context;
    await assertCallerIsOwner(supabase, userId, data.familyId);

    const { data: ta, error: taErr } = await supabase
      .from("team_accounts")
      .select("user_id, username")
      .eq("family_id", data.familyId)
      .maybeSingle();
    if (taErr) throw new Error(taErr.message);
    if (!ta) throw new Error("No team account for this family");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const password = generatePassword();
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      ta.user_id,
      { password },
    );
    if (updErr) throw new Error(`Failed to reset password: ${updErr.message}`);

    // Note: updateUserById invalidates refresh tokens. Old password is
    // immediately dead; existing sessions evict at next refresh (≤1h).
    return { username: ta.username, password };
  });

interface GetTeamAccountCredentialsInput {
  familyId: string;
}

interface GetTeamAccountCredentialsResult {
  exists: boolean;
  username?: string;
  createdAt?: string;
}

export const getTeamAccountCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GetTeamAccountCredentialsInput) => {
    if (!input?.familyId || typeof input.familyId !== "string")
      throw new Error("familyId required");
    return input;
  })
  .handler(async ({ data, context }): Promise<GetTeamAccountCredentialsResult> => {
    const { supabase, userId } = context;
    await assertCallerIsOwner(supabase, userId, data.familyId);

    const { data: ta, error } = await supabase
      .from("team_accounts")
      .select("username, created_at")
      .eq("family_id", data.familyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ta) return { exists: false };
    return { exists: true, username: ta.username, createdAt: ta.created_at };
  });
