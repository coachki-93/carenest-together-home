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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamilyChild, useMedications } from "@/lib/data/medications";

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

function EmergencyPage() {
  const { t } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const { data: child } = useFamilyChild(familyId);
  const { data: meds } = useMedications(familyId);

  const contacts = asContacts(child?.emergency_contacts);
  const doctors = asDoctors(child?.doctors);
  const activeMeds = (meds ?? []).filter((m) => m.active);

  return (
    <div className="min-h-screen bg-red-50">
      <header className="sticky top-0 z-10 bg-red-600 text-white shadow-md safe-pt">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-7" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                {t("emergency.title")}
              </div>
              <div className="text-lg font-extrabold leading-tight">
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
            className="rounded-full bg-white text-red-700 hover:bg-white/90"
          >
            <Link to="/dashboard">
              <ArrowLeft className="size-4 mr-1" />
              {t("emergency.back")}
            </Link>
          </Button>
        </div>
      </header>

      <main className="px-4 py-5 space-y-4 safe-pb max-w-3xl mx-auto">
        <a
          href="tel:112"
          className="block rounded-2xl bg-red-600 text-white px-5 py-5 text-center shadow-lg active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-center gap-3">
            <Phone className="size-7" />
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

        <Section icon={<Baby className="size-5" />} title={t("emergency.diagnosis")}>
          <p className="text-lg font-semibold whitespace-pre-wrap text-foreground">
            {child?.diagnosis?.trim() || t("emergency.notSet")}
          </p>
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

        <Section icon={<Pill className="size-5" />} title={t("emergency.activeMeds")}>
          {activeMeds.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {t("emergency.noMeds")}
            </p>
          ) : (
            <ul className="space-y-2">
              {activeMeds.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg bg-white px-3 py-2 border border-border"
                >
                  <div className="text-base font-bold">{m.name}</div>
                  {(m.dose_amount != null || m.dose_unit) && (
                    <div className="text-sm text-muted-foreground">
                      {[m.dose_amount, m.dose_unit].filter(Boolean).join(" ")}
                    </div>
                  )}
                </li>
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
          <Hospital className="size-5 text-red-700 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {t("emergency.disclaimer")}
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
  children: React.ReactNode;
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
          className="shrink-0 inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-4 py-2 text-sm font-bold shadow active:scale-95 transition-transform"
        >
          <Phone className="size-4" />
          {phone}
        </a>
      )}
    </li>
  );
}
