import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, X, Baby, RotateCcw } from "lucide-react";
import { z } from "zod";
import { toast } from "@/lib/notify";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { ImageUpload } from "@/components/carenest/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import { useFamilyChild } from "@/lib/data/medications";
import { useUpdateChild } from "@/lib/data/family";
import {
  ageMonthsFromDob,
  getVitalRanges,
  parseRangeOverrides,
  type VitalRangeOverrides,
  type VitalType,
} from "@/lib/data/vitals";


export const Route = createFileRoute("/_authenticated/child")({
  head: () => ({ meta: [{ title: "Child profile — CareNest" }] }),
  component: ChildProfilePage,
});

interface Contact { name: string; phone: string; relationship: string; }
interface Doctor { name: string; specialty: string; phone: string; }

function asContacts(v: unknown): Contact[] {
  if (!Array.isArray(v)) return [{ name: "", phone: "", relationship: "" }];
  const arr = v as Contact[];
  return arr.length ? arr : [{ name: "", phone: "", relationship: "" }];
}
function asDoctors(v: unknown): Doctor[] {
  if (!Array.isArray(v)) return [{ name: "", specialty: "", phone: "" }];
  const arr = v as Doctor[];
  return arr.length ? arr : [{ name: "", specialty: "", phone: "" }];
}

function ChildProfilePage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const { data: child, isLoading } = useFamilyChild(membership?.family_id);
  const updateChild = useUpdateChild();
  const canEdit = membership?.role === "owner";

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [allergies, setAllergies] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([{ name: "", phone: "", relationship: "" }]);
  const [doctors, setDoctors] = useState<Doctor[]>([{ name: "", specialty: "", phone: "" }]);
  const [customRanges, setCustomRanges] = useState<VitalRangeOverrides>({});

  useEffect(() => {
    if (!child) return;
    setName(child.name ?? "");
    setDob(child.date_of_birth ?? "");
    setDiagnosis(child.diagnosis ?? "");
    setAllergies(child.allergies ?? "");
    setPhotoPath(child.photo_url ?? null);
    setContacts(asContacts(child.emergency_contacts));
    setDoctors(asDoctors(child.doctors));
    setCustomRanges(parseRangeOverrides(child.custom_vital_ranges));
  }, [child]);

  const ageMonths = ageMonthsFromDob(dob);
  const defaultRanges = useMemo(() => getVitalRanges(ageMonths), [ageMonths]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!child) return;
    const schema = z.object({
      name: z.string().trim().min(1, t("onboardingChild.nameRequired")).max(80),
    });
    const parsed = schema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "");
      return;
    }

    try {
      await updateChild.mutateAsync({
        id: child.id,
        patch: {
          name: parsed.data.name,
          date_of_birth: dob || null,
          diagnosis: diagnosis || null,
          allergies: allergies || null,
          photo_url: photoPath,
          emergency_contacts: contacts.filter((c) => c.name.trim()) as unknown as never,
          doctors: doctors.filter((d) => d.name.trim()) as unknown as never,
          custom_vital_ranges: customRanges as unknown as never,
        },

      });
      toast.success(t("childPage.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("childPage.saveError"));
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title={t("nav.child")} subtitle={t("childPage.subtitle")}>
        <div className="card-soft p-10 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </DashboardLayout>
    );
  }

  if (!child) {
    return (
      <DashboardLayout title={t("nav.child")} subtitle={t("childPage.subtitle")}>
        <div className="card-soft p-10 text-center max-w-xl mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <Baby className="size-7" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">{t("childPage.emptyTitle")}</h2>
          <p className="text-muted-foreground">{t("childPage.emptyBody")}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("nav.child")} subtitle={t("childPage.subtitle")}>
      <form onSubmit={handleSubmit} className="card-soft p-8 space-y-8 max-w-3xl mx-auto">
        {!canEdit && (
          <div className="rounded-xl bg-muted/60 text-sm text-muted-foreground px-4 py-3">
            {t("childPage.readOnlyNotice")}
          </div>
        )}
        <fieldset disabled={!canEdit} className="space-y-8 min-w-0 contents">
        <section className="flex flex-col items-center">
          {user && (
            <ImageUpload
              userId={user.id}
              folder="children"
              value={photoPath}
              onChange={canEdit ? setPhotoPath : () => {}}
              size={120}
            />
          )}
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("onboardingChild.childName")} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" required />
          </Field>
          <Field label={t("onboardingChild.dob")}>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-12 rounded-xl" />
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
              <Input placeholder={t("onboardingChild.name")} value={item.name} onChange={(e) => set({ ...item, name: e.target.value })} className="h-11 rounded-xl" />
              <Input placeholder={t("onboardingChild.relationship")} value={item.relationship} onChange={(e) => set({ ...item, relationship: e.target.value })} className="h-11 rounded-xl" />
              <Input placeholder={t("onboardingChild.phone")} value={item.phone} onChange={(e) => set({ ...item, phone: e.target.value })} className="h-11 rounded-xl" />
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
              <Input placeholder={t("onboardingChild.doctorName")} value={item.name} onChange={(e) => set({ ...item, name: e.target.value })} className="h-11 rounded-xl" />
              <Input placeholder={t("onboardingChild.specialty")} value={item.specialty} onChange={(e) => set({ ...item, specialty: e.target.value })} className="h-11 rounded-xl" />
              <Input placeholder={t("onboardingChild.phone")} value={item.phone} onChange={(e) => set({ ...item, phone: e.target.value })} className="h-11 rounded-xl" />
            </div>
          )}
        />

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={updateChild.isPending} className="rounded-full h-12 px-8 text-base font-semibold">
              {updateChild.isPending && <Loader2 className="size-4 animate-spin" />}
              {updateChild.isPending ? t("common.saving") : t("childPage.save")}
            </Button>
          </div>
        )}
        </fieldset>
      </form>
    </DashboardLayout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
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
