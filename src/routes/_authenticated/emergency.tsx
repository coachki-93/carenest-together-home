import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Phone,
  Stethoscope,
  Users,
  Baby,
  Pill,
  Hospital,
  ArrowLeft,
  Eye,
  Info,
  WifiOff,
  ListChecks,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamilyChild, useMedications } from "@/lib/data/medications";
import {
  useEmergencySteps,
  type EmergencyStep,
  type EmergencyStepSeverity,
} from "@/lib/data/emergency-steps";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({ meta: [{ title: "Emergency info — CareNest" }] }),
  component: EmergencyPage,
});

interface Contact {
  name?: string;
  phone?: string;
  relationship?: string;
}
interface Doctor {
  name?: string;
  specialty?: string;
  phone?: string;
}

function asContacts(v: unknown): Contact[] {
  if (!Array.isArray(v)) return [];
  return (v as Contact[]).filter((c) => c && (c.name || c.phone));
}
function asDoctors(v: unknown): Doctor[] {
  if (!Array.isArray(v)) return [];
  return (v as Doctor[]).filter((d) => d && (d.name || d.phone));
}

function ageString(dob: string | null | undefined): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 24) return `${Math.max(0, months)} mo`;
  return `${Math.floor(months / 12)} y`;
}

interface Snapshot {
  child: {
    name?: string | null;
    date_of_birth?: string | null;
    diagnosis?: string | null;
    condition_details?: string | null;
    allergies?: string | null;
    emergency_contacts?: unknown;
    doctors?: unknown;
  } | null;
  meds: Array<{
    id: string;
    name: string;
    dose_amount: number | null;
    dose_unit: string | null;
    route: string;
    instructions: string | null;
    times: string[];
  }>;
  steps: EmergencyStep[];
  savedAt: number;
}

function loadSnapshot(familyId: string | null): Snapshot | null {
  if (!familyId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`emergency:${familyId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function saveSnapshot(familyId: string | null, snap: Snapshot) {
  if (!familyId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`emergency:${familyId}`, JSON.stringify(snap));
  } catch {
    /* quota / private mode — ignore */
  }
}

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function relativeTime(ts: number, locale: string): string {
  const diff = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

function EmergencyPage() {
  const { t, i18n } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const canEdit = membership?.role === "owner";
  const online = useOnline();

  const { data: liveChild } = useFamilyChild(familyId);
  const { data: liveMeds } = useMedications(familyId);
  const { data: liveSteps } = useEmergencySteps(familyId);

  const [snap, setSnap] = useState<Snapshot | null>(() => loadSnapshot(familyId));

  // Load cached snapshot when familyId becomes known.
  useEffect(() => {
    if (familyId) setSnap((prev) => prev ?? loadSnapshot(familyId));
  }, [familyId]);

  // Persist snapshot when live data resolves.
  useEffect(() => {
    if (!familyId) return;
    if (!liveChild && !liveMeds && !liveSteps) return;
    const next: Snapshot = {
      child: liveChild
        ? {
            name: liveChild.name,
            date_of_birth: liveChild.date_of_birth,
            diagnosis: liveChild.diagnosis,
            condition_details:
              (liveChild as unknown as { condition_details?: string | null })
                .condition_details ?? null,
            allergies: liveChild.allergies,
            emergency_contacts: liveChild.emergency_contacts,
            doctors: liveChild.doctors,
          }
        : snap?.child ?? null,
      meds: (liveMeds ?? [])
        .filter((m) => m.active)
        .map((m) => ({
          id: m.id,
          name: m.name,
          dose_amount: m.dose_amount,
          dose_unit: m.dose_unit,
          route: m.route,
          instructions: m.instructions,
          times: m.times ?? [],
        })),
      steps: liveSteps ?? snap?.steps ?? [],
      savedAt: Date.now(),
    };
    setSnap(next);
    saveSnapshot(familyId, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, liveChild, liveMeds, liveSteps]);

  const child = snap?.child ?? null;
  const meds = snap?.meds ?? [];
  const steps = snap?.steps ?? [];
  const contacts = asContacts(child?.emergency_contacts);
  const doctors = asDoctors(child?.doctors);
  const firstContactPhone = contacts.find((c) => c.phone)?.phone;
  const firstContactName = contacts.find((c) => c.phone)?.name;

  const lastUpdatedLabel = useMemo(() => {
    if (!snap?.savedAt) return null;
    return relativeTime(snap.savedAt, i18n.language || "en");
  }, [snap?.savedAt, i18n.language]);

  return (
    <div className="min-h-screen bg-red-50">
      <header className="sticky top-0 z-10 bg-red-600 text-white shadow-md safe-pt">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-7 shrink-0" aria-hidden />
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                {t("emergency.title")}
              </div>
              <div className="text-lg font-extrabold leading-tight truncate">
                {child?.name ?? t("emergency.child")}
                {child?.date_of_birth && (
                  <span className="ml-2 text-sm font-semibold opacity-90">
                    · {ageString(child.date_of_birth)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="rounded-full bg-white text-red-700 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white"
          >
            <Link to="/dashboard">
              <ArrowLeft className="size-4 mr-1" />
              {t("emergency.back")}
            </Link>
          </Button>
        </div>
      </header>

      <main className="px-4 py-5 space-y-4 safe-pb max-w-3xl mx-auto">
        {!online && (
          <div className="rounded-xl bg-amber-100 border-2 border-amber-400 text-amber-900 px-4 py-3 flex items-center gap-3">
            <WifiOff className="size-5 shrink-0" aria-hidden />
            <p className="text-sm font-semibold">{t("emergency.offline")}</p>
          </div>
        )}

        <a
          href="tel:112"
          className="block rounded-2xl bg-red-600 text-white px-5 py-5 text-center shadow-lg active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
        >
          <div className="flex items-center justify-center gap-3">
            <Phone className="size-7" aria-hidden />
            <div>
              <div className="text-2xl font-extrabold">
                {t("emergency.call112")}
              </div>
              <div className="text-sm font-semibold opacity-90">
                {t("emergency.call112Sub")}
              </div>
            </div>
          </div>
        </a>

        {firstContactPhone && (
          <a
            href={`tel:${firstContactPhone.replace(/\s+/g, "")}`}
            className="block rounded-2xl bg-white border-2 border-red-300 text-red-800 px-5 py-4 text-center shadow active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
          >
            <div className="flex items-center justify-center gap-3">
              <Phone className="size-6" aria-hidden />
              <div className="text-lg font-extrabold">
                {t("emergency.callContact", { name: firstContactName ?? "" })}
              </div>
            </div>
          </a>
        )}

        {/* Diagnosis + condition details */}
        <Section icon={<Baby className="size-5" />} title={t("emergency.diagnosis")}>
          {child?.diagnosis?.trim() ? (
            <div className="inline-block rounded-full bg-red-100 text-red-900 px-3 py-1 text-base font-bold border border-red-200">
              {child.diagnosis.trim()}
            </div>
          ) : (
            <p className="text-base text-muted-foreground">{t("emergency.notSet")}</p>
          )}
          {child?.condition_details?.trim() && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {t("emergency.conditionDetails")}
              </div>
              <RichBody text={child.condition_details} />
            </div>
          )}
        </Section>

        <Section
          icon={<AlertTriangle className="size-5 text-red-700" />}
          title={t("emergency.allergies")}
          accent
        >
          <p className="text-lg font-bold whitespace-pre-wrap text-red-900">
            {child?.allergies?.trim() || t("emergency.noneKnown")}
          </p>
        </Section>

        {/* Emergency action steps */}
        <Section
          icon={<ListChecks className="size-5 text-red-700" />}
          title={t("emergency.steps")}
          headerRight={
            canEdit ? (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full text-red-700 hover:bg-red-50 -mr-2"
              >
                <Link to="/child">
                  <Pencil className="size-4 mr-1" />
                  {t("emergency.stepsEditCta")}
                </Link>
              </Button>
            ) : null
          }
        >
          {steps.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {t("emergency.stepsEmpty")}
            </p>
          ) : (
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <StepCard key={s.id} step={s} index={i + 1} />
              ))}
            </ol>
          )}
        </Section>

        <Section icon={<Pill className="size-5" />} title={t("emergency.activeMeds")}>
          {meds.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {t("emergency.noMeds")}
            </p>
          ) : (
            <ul className="space-y-2">
              {meds.map((m) => (
                <MedRow key={m.id} med={m} />
              ))}
            </ul>
          )}
        </Section>

        <Section icon={<Users className="size-5" />} title={t("emergency.contacts")}>
          {contacts.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {t("emergency.notSet")}
            </p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c, i) => (
                <ContactRow
                  key={i}
                  name={c.name}
                  subtitle={c.relationship}
                  phone={c.phone}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<Stethoscope className="size-5" />}
          title={t("emergency.doctors")}
        >
          {doctors.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {t("emergency.notSet")}
            </p>
          ) : (
            <ul className="space-y-2">
              {doctors.map((d, i) => (
                <ContactRow
                  key={i}
                  name={d.name}
                  subtitle={d.specialty}
                  phone={d.phone}
                />
              ))}
            </ul>
          )}
        </Section>

        <div className="rounded-xl bg-white border border-border px-4 py-3 flex items-start gap-3">
          <Hospital className="size-5 text-red-700 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-muted-foreground">
            <p>{t("emergency.disclaimer")}</p>
            {lastUpdatedLabel && (
              <p className="mt-1 text-xs">
                {t("emergency.lastUpdated", { when: lastUpdatedLabel })}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function severityTone(sev: EmergencyStepSeverity) {
  switch (sev) {
    case "critical":
      return {
        wrap: "bg-red-50 border-red-500",
        num: "bg-red-600 text-white",
        chip: "text-red-700",
        icon: <AlertTriangle className="size-3.5" />,
      };
    case "monitor":
      return {
        wrap: "bg-amber-50 border-amber-500",
        num: "bg-amber-500 text-white",
        chip: "text-amber-800",
        icon: <Eye className="size-3.5" />,
      };
    default:
      return {
        wrap: "bg-slate-50 border-slate-400",
        num: "bg-slate-500 text-white",
        chip: "text-slate-700",
        icon: <Info className="size-3.5" />,
      };
  }
}

function StepCard({ step, index }: { step: EmergencyStep; index: number }) {
  const { t } = useTranslation();
  const tone = severityTone(step.severity);
  return (
    <li
      className={`rounded-xl border-l-4 border ${tone.wrap} px-4 py-3 flex items-start gap-3`}
    >
      <div
        className={`size-10 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0 ${tone.num}`}
        aria-hidden
      >
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl font-extrabold text-foreground leading-snug">
          {step.title}
        </div>
        {step.description && (
          <p className="text-base text-foreground/80 whitespace-pre-wrap mt-1">
            {step.description}
          </p>
        )}
        <div
          className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${tone.chip}`}
        >
          {tone.icon}
          {t(`emergencySteps.sev.${step.severity}`)}
        </div>
      </div>
    </li>
  );
}

function RichBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-base text-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("-"));
        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*-\s*/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function routeLabel(route: string, t: (k: string) => string): string {
  switch (route) {
    case "oral":
      return t("meds.routeOral");
    case "g_tube":
      return t("meds.routeGTube");
    case "injection":
      return t("meds.routeInjection");
    case "topical":
      return t("meds.routeTopical");
    case "inhaled":
      return t("meds.routeInhaled");
    default:
      return t("meds.routeOther");
  }
}

function MedRow({ med }: { med: Snapshot["meds"][number] }) {
  const { t } = useTranslation();
  const dose = [med.dose_amount, med.dose_unit].filter(Boolean).join(" ");
  const isPrn = !med.times || med.times.length === 0;
  return (
    <li className="rounded-lg bg-white px-3 py-2 border border-border">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-base font-bold">{med.name}</div>
        {isPrn && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase px-2 py-0.5">
            {t("emergency.medPrn")}
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {dose && <span className="font-semibold">{dose}</span>}
        {dose && med.route && <span> · </span>}
        {med.route && <span>{routeLabel(med.route, t)}</span>}
      </div>
      {med.instructions && (
        <div className="text-xs text-muted-foreground italic mt-0.5">
          {med.instructions}
        </div>
      )}
    </li>
  );
}

function Section({
  icon,
  title,
  accent,
  children,
  headerRight,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <section
      className={
        accent
          ? "rounded-2xl bg-red-100 border-2 border-red-300 px-4 py-4"
          : "rounded-2xl bg-white border border-border px-4 py-4 shadow-sm"
      }
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>
      {children}
    </section>
  );
}

function ContactRow({
  name,
  subtitle,
  phone,
}: {
  name?: string;
  subtitle?: string;
  phone?: string;
}) {
  return (
    <li className="rounded-lg bg-white border border-border px-3 py-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-base font-bold truncate">{name || "—"}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>
      {phone && (
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          className="shrink-0 inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-4 py-2 text-sm font-bold shadow active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
        >
          <Phone className="size-4" aria-hidden />
          {phone}
        </a>
      )}
    </li>
  );
}
