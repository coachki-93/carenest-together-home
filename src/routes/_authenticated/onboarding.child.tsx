import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/onboarding/child")({
  head: () => ({ meta: [{ title: "Add child profile — CareNest" }] }),
  component: ChildOnboarding,
});

interface Contact { name: string; phone: string; relationship: string; }
interface Doctor { name: string; specialty: string; phone: string; }

function ChildOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const profile = useProfile();
  const membership = useMyMembership();

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [allergies, setAllergies] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([{ name: "", phone: "", relationship: "" }]);
  const [doctors, setDoctors] = useState<Doctor[]>([{ name: "", specialty: "", phone: "" }]);

  const schema = z.object({
    name: z.string().trim().min(1, t("onboardingChild.nameRequired")).max(80),
    date_of_birth: z.string().optional(),
    diagnosis: z.string().trim().max(500).optional(),
    allergies: z.string().trim().max(500).optional(),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const parsed = schema.safeParse({ name, date_of_birth: dob, diagnosis, allergies });
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

      await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("onboardingChild.saved"));
      navigate({ to: "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Logo size={40} withWordmark />
          <LanguageToggle />
        </header>
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold">{t("onboardingChild.title")}</h1>
          <p className="text-muted-foreground">{t("onboardingChild.sub")}</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="card-soft p-8 space-y-8"
        >
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
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" required />
            </Field>
            <Field label={t("onboardingChild.dob")}>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-12 rounded-xl" />
            </Field>
          </div>

          <Field label={t("onboardingChild.diagnosis")}>
            <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3}
              className="rounded-xl" placeholder={t("onboardingChild.diagnosisPh")} />
          </Field>

          <Field label={t("onboardingChild.allergies")}>
            <Textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={2}
              className="rounded-xl" placeholder={t("onboardingChild.allergiesPh")} />
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

          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending} className="rounded-full h-12 px-8 text-base font-semibold">
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {save.isPending ? t("common.saving") : t("onboardingChild.saveBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
            <div className="flex-1">{renderRow(item, (next) => {
              const copy = [...items]; copy[i] = next; setItems(copy);
            })}</div>
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="rounded-full mt-0.5"
                onClick={() => setItems(items.filter((_, j) => j !== i))}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="rounded-full"
        onClick={() => setItems([...items, empty])}>
        <Plus className="size-4" /> {addLabel}
      </Button>
    </section>
  );
}
