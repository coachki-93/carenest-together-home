import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bug, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyMembership } from "@/lib/auth/use-profile";
import { toast } from "@/lib/notify";

/**
 * User-facing bug report form (Settings).
 * Writes through the caller's RLS-scoped client; the INSERT policy requires
 * reporter_id = auth.uid().
 */
export function ReportBugCard() {
  const { t } = useTranslation();
  const { user } = useSession();
  const membership = useMyMembership();
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);

  // The route the user was on before landing here (falls back to /settings).
  const pageContext = useRouterState({
    select: (s) => s.location.pathname,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const text = body.trim();
      if (!text) throw new Error(t("settingsPage.bugReport.required"));
      const { error } = await supabase.from("bug_reports").insert({
        reporter_id: user.id,
        family_id: membership.data?.family_id ?? null,
        submitter_email: user.email ?? null,
        page_context: pageContext ?? "/settings",
        body: text.slice(0, 5000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setDone(true);
      toast.success(t("settingsPage.bugReport.sent"));
    },
    onError: (e: Error) => toast.error(e.message),
    meta: { suppressGlobalError: true }, // safe: per-call onError set above
  });

  return (
    <section className="card-soft p-6 md:p-8 space-y-4">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Bug className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">
            {t("settingsPage.bugReport.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("settingsPage.bugReport.sub")}
          </p>
        </div>
      </header>

      {done ? (
        <div className="flex items-start gap-3 rounded-xl bg-primary-soft p-4">
          <CheckCircle2 className="size-5 text-primary shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {t("settingsPage.bugReport.thanks")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setDone(false)}
            >
              {t("settingsPage.bugReport.another")}
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="bug-body" className="text-sm font-semibold">
              {t("settingsPage.bugReport.label")}
            </Label>
            <Textarea
              id="bug-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 5000))}
              rows={5}
              maxLength={5000}
              required
              className="rounded-xl"
              placeholder={t("settingsPage.bugReport.placeholder")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/5000
            </p>
          </div>
          <Button
            type="submit"
            disabled={submit.isPending || !body.trim()}
            className="rounded-full"
          >
            {submit.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("settingsPage.bugReport.send")}
          </Button>
        </form>
      )}
    </section>
  );
}
