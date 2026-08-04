import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Platform-admin bug-report server functions.
 *
 * Kept OUT of admin.functions.ts on purpose: that module is restricted to the
 * metadata allow-list by scripts/check-admin-minimization.sh. bug_reports is
 * user-submitted PII (email + free text), never health data.
 *
 * Contract (mirrors billing-admin.functions.ts):
 *  - requireSupabaseAuth + assertCallerIsPlatformAdmin against the caller's
 *    RLS-scoped client BEFORE any supabaseAdmin escalation.
 *  - Explicit columns only — no select("*").
 *  - No delete path: reports are resolve-only.
 *  - One admin_audit_log row per view / action.
 */

async function assertCallerIsPlatformAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("is_platform_admin", {
    _uid: userId,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden: platform admin only");
}

async function logAdminAction(
  adminUserId: string,
  action: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target_family_id: null,
      target_user_id: null,
      detail: detail as never,
    });
  } catch (e) {
    console.error("[admin] audit log write failed", e);
  }
}

export type BugReportStatus = "new" | "read" | "resolved";

export interface AdminBugReportDTO {
  id: string;
  createdAt: string;
  updatedAt: string;
  reporterId: string | null;
  familyId: string | null;
  submitterEmail: string | null;
  pageContext: string | null;
  body: string;
  status: BugReportStatus;
  resolvedAt: string | null;
}

const COLUMNS =
  "id, created_at, updated_at, reporter_id, family_id, submitter_email, page_context, body, status, resolved_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDTO(row: any): AdminBugReportDTO {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    reporterId: row.reporter_id ?? null,
    familyId: row.family_id ?? null,
    submitterEmail: row.submitter_email ?? null,
    pageContext: row.page_context ?? null,
    body: String(row.body ?? ""),
    status: (row.status ?? "new") as BugReportStatus,
    resolvedAt: row.resolved_at ?? null,
  };
}

const ListSchema = z.object({
  status: z.enum(["all", "new", "read", "resolved"]).default("all"),
  limit: z.number().int().min(1).max(200).default(100),
});

export const adminListBugReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<AdminBugReportDTO[]> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let query = supabaseAdmin
      .from("bug_reports")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const list = (rows ?? []).map(toDTO);

    await logAdminAction(userId, "bug_report.list", {
      status: data.status,
      count: list.length,
    });

    return list;
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read", "resolved"]),
});

export const adminUpdateBugReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdminBugReportDTO> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: row, error } = await supabaseAdmin
      .from("bug_reports")
      .update({
        status: data.status,
        resolved_at: data.status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", data.id)
      .select(COLUMNS)
      .single();

    if (error) throw new Error(error.message);

    await logAdminAction(userId, "bug_report.status", {
      bug_report_id: data.id,
      status: data.status,
    });

    return toDTO(row);
  });
