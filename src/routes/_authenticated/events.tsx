import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { ByProfile } from "@/components/carenest/ByProfile";
import { CareEventDialog } from "@/components/carenest/CareEventDialog";
import {
  useCareEvents,
  useSetCareEventActive,
  canEditCareEvent,
  CARE_EVENT_TYPES,
  type CareEvent,
  type CareEventType,
} from "@/lib/data/care-events";
import { useFamily } from "@/lib/data/family";
import { useMyMembership } from "@/lib/auth/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/use-profile";
import { formatTimeIn, wallClockIn } from "@/lib/time/family-tz";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Händelser · CareNest" },
      {
        name: "description",
        content:
          "Logga och följ upp händelser: anfall, desaturationer, kräkningar och andra medicinska incidenter.",
      },
      { property: "og:title", content: "Händelser · CareNest" },
      {
        property: "og:description",
        content:
          "Logga och följ upp medicinska händelser med tid, beskrivning och åtgärd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
});

const KIND_ICONS: Record<CareEventType, React.ComponentType<{ className?: string }>> = {
  seizure: Zap,
  desaturation: Wind,
  vomiting: Utensils,
  feed_issue: CircleDot,
  breathing_difficulty: Activity,
  behavioural: Brain,
  injury: AlertTriangle,
  other: MoreHorizontal,
};

function useChild(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["events-child", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, care_needs")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function formatDuration(seconds: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (seconds < 60) return t("careEvents.duration.seconds", { s: seconds });
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return t("careEvents.duration.minutes", { m });
  return t("careEvents.duration.mixed", { m, s });
}

function EventsPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const { data: family } = useFamily(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";
  const { data: child } = useChild(familyId);
  const [filter, setFilter] = useState<CareEventType | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CareEvent | null>(null);
  const setActive = useSetCareEventActive();

  const { data: events, isLoading } = useCareEvents(familyId, {
    includeArchived: showArchived,
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    if (filter === "all") return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CareEvent[]>();
    for (const ev of filtered) {
      const day = wallClockIn(new Date(ev.occurred_at), tz).todayStr;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(ev);
    }
    return Array.from(map.entries());
  }, [filtered, tz]);

  async function toggleArchive(ev: CareEvent) {
    try {
      await setActive.mutateAsync({ id: ev.id, active: !ev.active });
      toast.success(ev.active ? t("careEvents.toast.archived") : t("careEvents.toast.unarchived"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t("common.saveFailed"));
    }
  }

  return (
    <DashboardLayout
      title={t("careEvents.pageTitle")}
      subtitle={t("careEvents.pageSubtitle")}
      actions={
        <>
          <LanguageToggle />
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="rounded-full font-semibold"
          >
            <Plus className="size-4 mr-1" />
            {t("careEvents.logEvent")}
          </Button>
        </>
      }
    >
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
              filter === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {t("careEvents.filter.all")}
          </button>
          {CARE_EVENT_TYPES.map((k) => {
            const Icon = KIND_ICONS[k];
            const selected = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" />
                {t(`careEvents.types.${k}`)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end mb-4">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="size-3.5"
            />
            {t("careEvents.showArchived")}
          </label>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">
            {t("common.loading")}
          </div>
        ) : grouped.length === 0 ? (
          <div className="card-soft p-12 text-center">
            <div className="mx-auto size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Activity className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{t("careEvents.empty.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("careEvents.empty.body")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, rows]) => (
              <section key={day}>
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  {new Intl.DateTimeFormat(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: tz,
                  }).format(new Date(rows[0].occurred_at))}
                </h2>
                <ul className="space-y-2">
                  {rows.map((ev) => {
                    const Icon = KIND_ICONS[ev.type];
                    const canEdit = canEditCareEvent(ev, user?.id);
                    const isAuthor = user?.id === ev.created_by;
                    return (
                      <li
                        key={ev.id}
                        className={`card-soft p-4 ${!ev.active ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatTimeIn(ev.occurred_at, tz)}
                              </span>
                              <span className="font-semibold text-sm">
                                {t(`careEvents.types.${ev.type}`)}
                              </span>
                              {ev.severity != null && (
                                <span className="text-xs rounded-full px-2 py-0.5 bg-muted">
                                  {t(
                                    `careEvents.severity.${
                                      ev.severity === 1
                                        ? "mild"
                                        : ev.severity === 2
                                          ? "moderate"
                                          : "severe"
                                    }`,
                                  )}
                                </span>
                              )}
                              {ev.duration_seconds != null && ev.duration_seconds > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  · {formatDuration(ev.duration_seconds, t)}
                                </span>
                              )}
                              {!ev.active && (
                                <span className="text-xs rounded-full px-2 py-0.5 bg-muted">
                                  {t("careEvents.archived")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {ev.description}
                            </p>
                            {ev.action_taken && (
                              <p className="text-sm mt-1 text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {t("careEvents.actionLabel")}:
                                </span>{" "}
                                {ev.action_taken}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              <ByProfile
                                familyId={familyId}
                                caregiverProfileId={ev.caregiver_profile_id}
                                authorUserId={ev.created_by}
                                viewerUserId={user?.id}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                              />
                              {ev.edited_at && (
                                <span className="text-xs text-muted-foreground">
                                  · {t("careEvents.edited")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditing(ev);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            {isAuthor && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleArchive(ev)}
                                title={ev.active ? t("careEvents.archive") : t("careEvents.unarchive")}
                              >
                                {ev.active ? (
                                  <Archive className="size-3.5" />
                                ) : (
                                  <ArchiveRestore className="size-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {familyId && (
        <CareEventDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
          familyId={familyId}
          childId={child?.id ?? null}
          careNeeds={child?.care_needs}
          event={editing}
        />
      )}
    </DashboardLayout>

  );
}
