import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, Check, Copy, Sparkles, Baby, Pill, Users } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyMembership, useProfile } from "@/lib/auth/use-profile";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { ImageUpload } from "@/components/carenest/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateInvite, useInvites } from "@/lib/data/family";

const stepSchema = z.object({
  step: z.coerce.number().int().min(1).max(5).optional().default(1),
});

export const Route = createFileRoute("/_authenticated/onboarding/child")({
  head: () => ({ meta: [{ title: "Welcome to CareNest" }] }),
  validateSearch: stepSchema,
  component: ChildOnboarding,
});

const TOTAL_STEPS = 5;

interface Contact {
  name: string;
  phone: string;
  relationship: string;
}
interface Doctor {
  name: string;
  specialty: string;
  phone: string;
}

function ChildOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { step } = useSearch({ from: Route.id });

  const goTo = (n: number) =>
    navigate({ to: "/onboarding/child", search: { step: n }, replace: true });

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Logo size={40} withWordmark />
          <LanguageToggle />
        </header>

        <ProgressDots current={step} total={TOTAL_STEPS} />

        {step === 1 && <StepWelcome onNext={() => goTo(2)} onSkip={() => goTo(5)} />}
        {step === 2 && (
          <StepChild
            onBack={() => goTo(1)}
            onContinue={() => goTo(3)}
            onSkip={() => goTo(3)}
          />
        )}
        {step === 3 && (
          <StepFirstMedication
            onBack={() => goTo(2)}
            onContinue={() => goTo(4)}
            onSkip={() => goTo(4)}
          />
        )}
        {step === 4 && (
          <StepInvite
            onBack={() => goTo(3)}
            onContinue={() => goTo(5)}
            onSkip={() => goTo(5)}
          />
        )}
        {step === 5 && (
          <StepDone
            onBack={() => goTo(4)}
            onFinish={() => navigate({ to: "/dashboard", search: { tour: 1 } as never })}
          />
        )}

        <p className="text-center text-xs text-muted-foreground">
          {t("wizard.canResumeLater")}
        </p>
      </div>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div
            key={n}
            className={`h-2 rounded-full transition-all ${
              active
                ? "w-8 sm:w-10 bg-primary"
                : done
                  ? "w-3 sm:w-4 bg-primary/60"
                  : "w-3 sm:w-4 bg-border"
            }`}
          />
        );
      })}
    </div>
  );
}

/* ----------------------------- Step 1: Welcome ----------------------------- */
function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  return (
    <div className="card-soft p-8 md:p-10 text-center space-y-6">
      <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
        <Sparkles className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold">
          {firstName ? t("wizard.welcomeHi", { name: firstName }) : t("wizard.welcome")}
        </h1>
        <p className="text-muted-foreground">{t("wizard.welcomeSub")}</p>
      </div>
      <ul className="text-left max-w-md mx-auto space-y-3">
        <BulletRow icon={Baby} title={t("wizard.b1Title")} body={t("wizard.b1Body")} />
        <BulletRow icon={Pill} title={t("wizard.b2Title")} body={t("wizard.b2Body")} />
        <BulletRow icon={Users} title={t("wizard.b3Title")} body={t("wizard.b3Body")} />
      </ul>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <Button variant="ghost" className="rounded-full" onClick={onSkip}>
          {t("wizard.skipSetup")}
        </Button>
        <Button
          className="rounded-full h-12 px-8 text-base font-bold"
          onClick={onNext}
        >
          {t("wizard.letsGo")}
        </Button>
      </div>
    </div>
  );
}

function BulletRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/60 p-3">
      <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </li>
  );
}

/* ----------------------------- Step 2: Child ------------------------------ */
function StepChild({
  onBack,
  onContinue,
  onSkip,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useSession();
  const profile = useProfile();
  const membership = useMyMembership();

  // Load any existing child so revisits don't recreate it.
  const existingChild = useQuery({
    queryKey: ["wizard-existing-child", membership.data?.family_id],
    enabled: !!membership.data?.family_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("family_id", membership.data!.family_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [allergies, setAllergies] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "", phone: "", relationship: "" },
  ]);
  const [doctors, setDoctors] = useState<Doctor[]>([
    { name: "", specialty: "", phone: "" },
  ]);

  useEffect(() => {
    const c = existingChild.data;
    if (!c) return;
    setName(c.name ?? "");
    setDob(c.date_of_birth ?? "");
    setDiagnosis(c.diagnosis ?? "");
    setAllergies(c.allergies ?? "");
    setPhotoPath(c.photo_url ?? null);
    if (Array.isArray(c.emergency_contacts) && c.emergency_contacts.length > 0) {
      setContacts(c.emergency_contacts as unknown as Contact[]);
    }
    if (Array.isArray(c.doctors) && c.doctors.length > 0) {
      setDoctors(c.doctors as unknown as Doctor[]);
    }
  }, [existingChild.data]);

  const schema = z.object({
    name: z.string().trim().min(1, t("onboardingChild.nameRequired")).max(80),
    date_of_birth: z.string().optional(),
    diagnosis: z.string().trim().max(500).optional(),
    allergies: z.string().trim().max(500).optional(),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const parsed = schema.safeParse({
        name,
        date_of_birth: dob,
        diagnosis,
        allergies,
      });
      if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "");

      let familyId = membership.data?.family_id;
      if (!familyId) {
        const familyName = `${(profile.data?.full_name || "Our").split(" ")[0]}'s Family`;
        const { data: fam, error: fErr } = await supabase
          .from("families")
          .insert({ owner_id: user.id, name: familyName })
          .select("id")
          .single();
        if (fErr) throw fErr;
        familyId = fam.id;
        const { error: mErr } = await supabase
          .from("family_members")
          .insert({ family_id: familyId, user_id: user.id, role: "owner" });
        if (mErr) throw mErr;
      }

      const cleanContacts = contacts.filter((c) => c.name.trim());
      const cleanDoctors = doctors.filter((d) => d.name.trim());

      if (existingChild.data) {
        const { error: uErr } = await supabase
          .from("children")
          .update({
            name: parsed.data.name,
            date_of_birth: parsed.data.date_of_birth || null,
            diagnosis: parsed.data.diagnosis || null,
            allergies: parsed.data.allergies || null,
            photo_url: photoPath,
            emergency_contacts: cleanContacts as unknown as never,
            doctors: cleanDoctors as unknown as never,
          })
          .eq("id", existingChild.data.id);
        if (uErr) throw uErr;
      } else {
        const { error: cErr } = await supabase.from("children").insert({
          family_id: familyId,
          name: parsed.data.name,
          date_of_birth: parsed.data.date_of_birth || null,
          diagnosis: parsed.data.diagnosis || null,
          allergies: parsed.data.allergies || null,
          photo_url: photoPath,
          emergency_contacts: cleanContacts as unknown as never,
          doctors: cleanDoctors as unknown as never,
        });
        if (cErr) throw cErr;
      }

      await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("onboardingChild.saved"));
      onContinue();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="card-soft p-6 md:p-8 space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold">
          {t("onboardingChild.title")}
        </h2>
        <p className="text-muted-foreground">{t("onboardingChild.sub")}</p>
      </div>

      <section className="flex flex-col items-center">
        {user && (
          <ImageUpload
            userId={user.id}
            folder="children"
            value={photoPath}
            onChange={setPhotoPath}
            size={120}
          />
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("onboardingChild.childName")} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
        </Field>
        <Field label={t("onboardingChild.dob")}>
          <Input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="h-12 rounded-xl"
          />
        </Field>
      </div>

      <Field label={t("onboardingChild.diagnosis")}>
        <Textarea
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          rows={3}
          className="rounded-xl"
          placeholder={t("onboardingChild.diagnosisPh")}
        />
      </Field>

      <Field label={t("onboardingChild.allergies")}>
        <Textarea
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          rows={2}
          className="rounded-xl"
          placeholder={t("onboardingChild.allergiesPh")}
        />
      </Field>

      <Repeater
        title={t("onboardingChild.emergencyContacts")}
        items={contacts}
        setItems={setContacts}
        empty={{ name: "", phone: "", relationship: "" }}
        addLabel={t("common.addAnother")}
        renderRow={(item, set) => (
          <div className="grid sm:grid-cols-3 gap-2">
            <Input
              placeholder={t("onboardingChild.name")}
              value={item.name}
              onChange={(e) => set({ ...item, name: e.target.value })}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder={t("onboardingChild.relationship")}
              value={item.relationship}
              onChange={(e) => set({ ...item, relationship: e.target.value })}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder={t("onboardingChild.phone")}
              value={item.phone}
              onChange={(e) => set({ ...item, phone: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        )}
      />

      <Repeater
        title={t("onboardingChild.doctors")}
        items={doctors}
        setItems={setDoctors}
        empty={{ name: "", specialty: "", phone: "" }}
        addLabel={t("common.addAnother")}
        renderRow={(item, set) => (
          <div className="grid sm:grid-cols-3 gap-2">
            <Input
              placeholder={t("onboardingChild.doctorName")}
              value={item.name}
              onChange={(e) => set({ ...item, name: e.target.value })}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder={t("onboardingChild.specialty")}
              value={item.specialty}
              onChange={(e) => set({ ...item, specialty: e.target.value })}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder={t("onboardingChild.phone")}
              value={item.phone}
              onChange={(e) => set({ ...item, phone: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        )}
      />

      <StepFooter
        onBack={onBack}
        onSkip={existingChild.data ? onSkip : undefined}
        primaryLabel={
          save.isPending ? t("common.saving") : t("wizard.saveContinue")
        }
        primaryDisabled={save.isPending}
        primaryType="submit"
        primaryLoading={save.isPending}
      />
    </form>
  );
}

/* --------------------- Step 3: First medication (optional) ----------------- */
function StepFirstMedication({
  onBack,
  onContinue,
  onSkip,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useSession();
  const membership = useMyMembership();
  const familyId = membership.data?.family_id;

  const child = useQuery({
    queryKey: ["wizard-child", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, name")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState("mg");
  const [time, setTime] = useState("08:00");

  // If the user skipped step 2 (no child yet), there's nothing to attach a med
  // to — skip this step automatically once the child query has settled.
  useEffect(() => {
    if (!child.isFetched) return;
    if (!child.data) onSkip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.isFetched, child.data?.id]);

  const create = useMutation({
    mutationFn: async () => {
      if (!user || !familyId || !child.data) throw new Error("Setup incomplete");
      if (!name.trim()) throw new Error(t("wizard.medNameRequired"));
      const amt = doseAmount ? Number(doseAmount) : null;
      const { error } = await supabase.from("medications").insert({
        family_id: familyId,
        child_id: child.data.id,
        created_by: user.id,
        name: name.trim(),
        dose_amount: amt,
        dose_unit: doseUnit || null,
        route: "oral",
        times: time ? [time] : [],
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      toast.success(t("wizard.medAdded"));
      onContinue();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card-soft p-6 md:p-8 space-y-6">
      <div className="space-y-2 text-center">
        <div className="size-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
          <Pill className="size-7" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold">{t("wizard.medTitle")}</h2>
        <p className="text-muted-foreground">{t("wizard.medSub")}</p>
      </div>

      <div className="space-y-4">
        <Field label={t("meds.name")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("meds.namePh")}
            className="h-12 rounded-xl"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("wizard.doseAmount")}>
            <Input
              inputMode="decimal"
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
              placeholder="250"
              className="h-12 rounded-xl"
            />
          </Field>
          <Field label={t("wizard.doseUnit")}>
            <Input
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value)}
              placeholder="mg"
              className="h-12 rounded-xl"
            />
          </Field>
        </div>
        <Field label={t("wizard.firstTime")}>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-12 rounded-xl"
          />
        </Field>
        <p className="text-xs text-muted-foreground">{t("wizard.medMoreLater")}</p>
      </div>

      <StepFooter
        onBack={onBack}
        onSkip={onSkip}
        primaryLabel={
          create.isPending ? t("common.saving") : t("wizard.saveContinue")
        }
        primaryDisabled={create.isPending || !name.trim()}
        primaryLoading={create.isPending}
        onPrimary={() => create.mutate()}
      />
    </div>
  );
}

/* --------------------- Step 4: Invite caregivers (optional) ---------------- */
function StepInvite({
  onBack,
  onContinue,
  onSkip,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useSession();
  const membership = useMyMembership();
  const familyId = membership.data?.family_id;
  const invites = useInvites(familyId);
  const createInvite = useCreateInvite();
  const existingPending = useMemo(
    () => (invites.data ?? []).find((i) => i.status === "pending"),
    [invites.data],
  );
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (existingPending && !code) setCode(existingPending.code);
  }, [existingPending, code]);

  async function generate() {
    if (!familyId || !user) return;
    try {
      const inv = await createInvite.mutateAsync({
        familyId,
        createdBy: user.id,
      });
      setCode(inv.code);
      toast.success(t("wizard.inviteCreated"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function copyCode() {
    if (!code) return;
    void navigator.clipboard?.writeText(code);
    toast.success(t("wizard.copied"));
  }

  return (
    <div className="card-soft p-6 md:p-8 space-y-6">
      <div className="space-y-2 text-center">
        <div className="size-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
          <Users className="size-7" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold">
          {t("wizard.inviteTitle")}
        </h2>
        <p className="text-muted-foreground">{t("wizard.inviteSub")}</p>
      </div>

      {code ? (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary-soft/40 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {t("wizard.inviteCodeLabel")}
          </p>
          <div className="text-3xl font-extrabold tracking-widest mb-4 font-mono">
            {code}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={copyCode}
          >
            <Copy className="size-4" /> {t("wizard.copy")}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            {t("wizard.inviteHowto")}
          </p>
        </div>
      ) : (
        <div className="text-center py-4">
          <Button
            size="lg"
            className="rounded-full font-bold"
            onClick={generate}
            disabled={createInvite.isPending || !familyId}
          >
            {createInvite.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {t("wizard.generateInvite")}
          </Button>
        </div>
      )}

      <StepFooter
        onBack={onBack}
        onSkip={onSkip}
        primaryLabel={t("wizard.continue")}
        onPrimary={onContinue}
      />
    </div>
  );
}

/* ----------------------------- Step 5: All set ----------------------------- */
function StepDone({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="card-soft p-8 md:p-10 text-center space-y-6">
      <div className="size-16 rounded-2xl bg-success/20 text-success-foreground flex items-center justify-center mx-auto">
        <Check className="size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-extrabold">
          {t("wizard.doneTitle")}
        </h2>
        <p className="text-muted-foreground">{t("wizard.doneSub")}</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          {t("wizard.back")}
        </Button>
        <Button
          className="rounded-full h-12 px-8 text-base font-bold"
          onClick={onFinish}
        >
          {t("wizard.openDashboard")}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------- helpers --------------------------------- */
function StepFooter({
  onBack,
  onSkip,
  onPrimary,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  primaryType,
}: {
  onBack: () => void;
  onSkip?: () => void;
  onPrimary?: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  primaryType?: "submit" | "button";
}) {
  const { t } = useTranslation();
  return (
    <div className="-mx-6 md:-mx-8 -mb-6 md:-mb-8 mt-4 px-6 md:px-8 py-4 md:py-0 md:pt-2 border-t border-border/40 md:border-0 bg-card/95 backdrop-blur md:bg-transparent md:backdrop-blur-0 sticky bottom-0 md:static rounded-b-2xl flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full"
          onClick={onBack}
        >
          {t("wizard.back")}
        </Button>
        {onSkip && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={onSkip}
          >
            {t("wizard.skipStep")}
          </Button>
        )}
      </div>
      <Button
        type={primaryType ?? "button"}
        onClick={primaryType === "submit" ? undefined : onPrimary}
        disabled={primaryDisabled}
        className="rounded-full h-12 px-8 text-base font-bold w-full sm:w-auto"
      >
        {primaryLoading && <Loader2 className="size-4 animate-spin" />}
        {primaryLabel}
      </Button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Repeater<T>({
  title,
  items,
  setItems,
  empty,
  addLabel,
  renderRow,
}: {
  title: string;
  items: T[];
  setItems: (next: T[]) => void;
  empty: T;
  addLabel: string;
  renderRow: (item: T, set: (next: T) => void) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1">
              {renderRow(item, (next) => {
                const copy = [...items];
                copy[i] = next;
                setItems(copy);
              })}
            </div>
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full mt-0.5"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setItems([...items, empty])}
      >
        <Plus className="size-4" /> {addLabel}
      </Button>
    </section>
  );
}
