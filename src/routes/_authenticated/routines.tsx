import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Info, Pill, Plus, X } from "lucide-react";
import { z } from "zod";
import { toast } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { ChecklistEditor } from "@/components/carenest/ChecklistEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import { useFamily } from "@/lib/data/family";
import { useFamilyChild } from "@/lib/data/medications";
import { parseCareNeeds } from "@/lib/care-needs/parse";
import {
  allCreatedTemplateKeys,
  mergeRoutinesState,
  readScaffoldsMap,
  type RoutinesStatus,
} from "@/lib/care-needs/scaffold-status";
import {
  QUIET_TIMES_THRESHOLD,
  groupTemplatesByNeed,
  initialSelected,
  isRoutineValid,
  normalizeTimes,
  templateToAppointment,
  type RoutineEdits,
  type RoutineFreq,
  type RoutineTemplate,
} from "@/lib/care-needs/routine-templates";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  child: z.string().optional(),
  needs: z.string().optional(),
  from: z.enum(["onboarding", "child"]).optional(),
});

export const Route = createFileRoute("/_authenticated/routines")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Suggested routines — Tillsa" },
      { name: "description", content: "Suggested care routines based on your child's care needs." },
      { property: "og:title", content: "Suggested routines — Tillsa" },
      { property: "og:description", content: "Suggested care routines based on your child's care needs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutinesPage,
});

const FREQS: RoutineFreq[] = ["hourly", "daily", "weekly", "monthly"];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

type Row = { selected: boolean; edits: RoutineEdits };

function RoutinesPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: family } = useFamily(familyId);
  const { data: child } = useFamilyChild(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";
  const isOwner = membership?.role === "owner";

  const careRaw = (child as unknown as { care_needs?: unknown } | null)?.care_needs;
  const care = useMemo(() => parseCareNeeds(careRaw), [careRaw]);
  const scaffolds = useMemo(() => readScaffoldsMap(careRaw), [careRaw]);
  const createdKeys = useMemo(() => allCreatedTemplateKeys(scaffolds), [scaffolds]);

  const needs = useMemo(() => {
    const requested = search.needs?.split(",").filter(Boolean);
    const base = requested && requested.length > 0 ? requested : care.capabilities;
    return base.filter((c) => care.capabilities.includes(c));
  }, [search.needs, care.capabilities]);
  const groups = useMemo(() => groupTemplatesByNeed(needs), [needs]);

  const { data: existingKinds } = useQuery({
    queryKey: ["routine-existing-kinds", child?.id],
    enabled: !!child?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("kind")
        .eq("child_id", child!.id)
        .is("recurrence_parent_id", null);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.kind as string));
    },
  });

  const [rows, setRows] = useState<Record<string, Row>>({});
  const [initialised, setInitialised] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialised || !child || !existingKinds) return;
    const next: Record<string, Row> = {};
    for (const g of groups) {
      for (const tpl of g.templates) {
        next[tpl.key] = {
          selected: !createdKeys.has(tpl.key) && initialSelected(tpl, existingKinds),
          edits: {
            title: t(tpl.titleKey),
            freq: tpl.freq,
            interval: tpl.interval,
            timesOfDay: [...tpl.timesOfDay],
            checklist: tpl.stepKeys.map((k) => ({ id: newId(), label: t(k) })),
          },
        };
      }
    }
    setRows(next);
    setInitialised(true);
  }, [initialised, child, existingKinds, groups, createdKeys, t]);

  function update(key: string, patch: Partial<Row> | ((r: Row) => Row)) {
    setRows((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const next = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
      return { ...prev, [key]: next };
    });
  }

  const allTemplates = groups.flatMap((g) => g.templates);
  const ticked = allTemplates.filter(
    (tpl) => tpl.target === "task" && !createdKeys.has(tpl.key) && rows[tpl.key]?.selected,
  );
  const invalid = new Set(
    ticked.filter((tpl) => !isRoutineValid(rows[tpl.key].edits)).map((tpl) => tpl.key),
  );

  async function persistStatuses(created: Record<string, string>, skipAll: boolean) {
    if (!child) return;
    // Re-read to merge onto the freshest care_needs.
    const { data: fresh, error: readErr } = await supabase
      .from("children")
      .select("care_needs")
      .eq("id", child.id)
      .single();
    if (readErr) throw readErr;
    const updates: Record<string, { status: RoutinesStatus; created?: Record<string, string> }> = {};
    for (const g of groups) {
      const mine: Record<string, string> = {};
      for (const tpl of g.templates) if (created[tpl.key]) mine[tpl.key] = created[tpl.key];
      const alreadyAny = g.templates.some((tpl) => createdKeys.has(tpl.key));
      const status: RoutinesStatus =
        !skipAll && (Object.keys(mine).length > 0 || alreadyAny) ? "done" : "dismissed";
      updates[g.capability] = { status, created: mine };
    }
    const merged = mergeRoutinesState(fresh.care_needs, updates);
    const { error } = await supabase
      .from("children")
      .update({ care_needs: merged as never })
      .eq("id", child.id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["family-child"] });
    qc.invalidateQueries({ queryKey: ["dashboard-child"] });
    qc.invalidateQueries({ queryKey: ["children"] });
  }

  function finish() {
    navigate(
      search.from === "onboarding"
        ? { to: "/dashboard", search: { tour: 1 } as never }
        : { to: "/dashboard" },
    );
  }

  async function handleSave() {
    if (!child || !familyId || !user) return;
    if (invalid.size > 0) {
      setShowErrors(true);
      toast.error(t("routines.fixErrors"));
      return;
    }
    setSaving(true);
    const created: Record<string, string> = {};
    try {
      for (const tpl of ticked) {
        const payload = templateToAppointment(tpl, rows[tpl.key].edits, {
          familyId,
          childId: child.id,
          userId: user.id,
          tz,
          now: new Date(),
        });
        if (!payload) continue;
        const { data, error } = await supabase
          .from("appointments")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        created[tpl.key] = (data as { id: string }).id;
      }
      await persistStatuses(created, false);
      qc.invalidateQueries({ queryKey: ["appointments"] });
      const n = Object.keys(created).length;
      if (n > 0) toast.success(t("routines.saved", { count: n }));
      finish();
    } catch (e) {
      // Record whatever was created so a retry never duplicates it.
      if (Object.keys(created).length > 0) {
        try {
          await persistStatuses(created, false);
        } catch {
          /* surfaced below */
        }
      }
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await persistStatuses({}, true);
      finish();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Onboarding with no matching suggestions: go straight on, as before.
  useEffect(() => {
    if (initialised && groups.length === 0 && search.from === "onboarding") finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialised, groups.length, search.from]);

  const name = child?.name ?? "";

  return (
    <DashboardLayout title={t("routines.title")} subtitle={t("routines.subtitle", { name })}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 flex gap-3 items-start">
          <Info className="size-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{t("routines.note")}</p>
        </div>

        {!isOwner ? (
          <div className="card-soft p-6 text-muted-foreground">{t("routines.ownerOnly")}</div>
        ) : !initialised ? (
          <div className="card-soft p-6 text-muted-foreground">{t("common.loading")}</div>
        ) : groups.length === 0 ? (
          <div className="card-soft p-6 text-muted-foreground">{t("routines.none")}</div>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.capability} className="card-soft p-5 space-y-3">
                <h2 className="text-lg font-bold">
                  {t(`careNeeds.capabilities.${g.capability}.label`)}
                </h2>
                <ul className="space-y-3">
                  {g.templates.map((tpl) => (
                    <SuggestionRow
                      key={tpl.key}
                      tpl={tpl}
                      row={rows[tpl.key]}
                      added={createdKeys.has(tpl.key)}
                      error={showErrors && invalid.has(tpl.key)}
                      onChange={(p) => update(tpl.key, p)}
                    />
                  ))}
                </ul>
              </section>
            ))}
            <div className="flex flex-wrap justify-end gap-2 pb-8">
              <Button variant="ghost" className="rounded-full" onClick={handleSkip} disabled={saving}>
                {t("routines.skip")}
              </Button>
              <Button className="rounded-full font-bold" onClick={handleSave} disabled={saving}>
                {saving ? t("common.saving") : t("routines.addSelected")}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SuggestionRow({
  tpl,
  row,
  added,
  error,
  onChange,
}: {
  tpl: RoutineTemplate;
  row: Row | undefined;
  added: boolean;
  error: boolean;
  onChange: (p: Partial<Row> | ((r: Row) => Row)) => void;
}) {
  const { t } = useTranslation();
  const title = row?.edits.title ?? t(tpl.titleKey);

  if (tpl.target === "medication_link") {
    return (
      <li className="rounded-2xl border border-border/60 p-3 flex items-center gap-3">
        <Pill className="size-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{t(tpl.titleKey)}</div>
          <div className="text-xs text-muted-foreground">{t("routines.medLink")}</div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/medications">{t("routines.medLinkCta")}</Link>
        </Button>
      </li>
    );
  }

  if (added || !row) {
    return (
      <li className="rounded-2xl border border-border/60 p-3 flex items-center gap-3 opacity-70">
        <Checkbox checked disabled aria-label={title} />
        <span className="flex-1 font-semibold">{title}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-success inline-flex items-center gap-1">
          <Check className="size-3.5" />
          {t("routines.added")}
        </span>
      </li>
    );
  }

  const e = row.edits;
  const setEdits = (p: Partial<RoutineEdits>) => onChange((r) => ({ ...r, edits: { ...r.edits, ...p } }));
  const quiet = normalizeTimes(e.timesOfDay).length > QUIET_TIMES_THRESHOLD;

  return (
    <li
      className={cn(
        "rounded-2xl border p-3 space-y-3",
        error ? "border-destructive" : "border-border/60",
        !row.selected && "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={row.selected}
          onCheckedChange={(c) => onChange({ selected: c === true })}
          aria-label={title}
        />
        <Input
          value={e.title}
          onChange={(ev) => setEdits({ title: ev.target.value })}
          aria-label={t("routines.titleLabel")}
          className="rounded-xl h-9 font-semibold"
        />
      </div>
      {row.selected && (
        <div className="space-y-3 pl-7">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Label className="font-semibold">{t("routines.repeat")}</Label>
            <span>{t("routines.every")}</span>
            <Input
              type="number"
              min={1}
              value={e.interval}
              onChange={(ev) => setEdits({ interval: Math.max(1, parseInt(ev.target.value, 10) || 1) })}
              className="w-16 h-9 rounded-xl"
            />
            <Select value={e.freq} onValueChange={(v) => setEdits({ freq: v as RoutineFreq })}>
              <SelectTrigger className="w-28 h-9 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {t(`routines.freq_${f}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {e.freq === "weekly" && <span className="text-muted-foreground">{t("routines.weeklyHint")}</span>}
            {e.freq === "monthly" && <span className="text-muted-foreground">{t("routines.monthlyHint")}</span>}
          </div>
          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">{t("routines.times")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {e.timesOfDay.map((time, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={time}
                    onChange={(ev) =>
                      setEdits({ timesOfDay: e.timesOfDay.map((x, j) => (j === i ? ev.target.value : x)) })
                    }
                    className="w-28 h-9 rounded-xl"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEdits({ timesOfDay: e.timesOfDay.filter((_, j) => j !== i) })}
                    aria-label={t("scheduleEvents.checklist.remove")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setEdits({ timesOfDay: [...e.timesOfDay, "08:00"] })}
              >
                <Plus className="size-4 mr-1" />
                {t("routines.addTime")}
              </Button>
            </div>
            {error && <p className="text-sm font-medium text-destructive">{t("routines.needTime")}</p>}
            {quiet && <p className="text-xs text-muted-foreground">{t("routines.quietHint")}</p>}
          </div>
          <ChecklistEditor steps={e.checklist} onChange={(c) => setEdits({ checklist: c })} />
        </div>
      )}
    </li>
  );
}
