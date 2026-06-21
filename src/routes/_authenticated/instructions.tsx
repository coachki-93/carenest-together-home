import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/carenest/RichTextEditor";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";

type Instruction = Database["public"]["Tables"]["care_instructions"]["Row"];

export const Route = createFileRoute("/_authenticated/instructions")({
  head: () => ({ meta: [{ title: "Instructions — CareNest" }] }),
  component: InstructionsPage,
});

function useInstructions(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["care-instructions", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_instructions")
        .select("*")
        .eq("family_id", familyId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Instruction[];
    },
  });
}

function InstructionsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: instructions, isLoading } = useInstructions(familyId);

  const [editing, setEditing] = useState<Instruction | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Instruction | null>(null);

  const save = useMutation({
    mutationFn: async (payload: { id?: string; title: string; body: string }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("care_instructions")
          .update({ title: payload.title, body: payload.body })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("care_instructions").insert({
          family_id: familyId!,
          created_by: user!.id,
          title: payload.title,
          body: payload.body,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-instructions", familyId] });
      toast.success(t("instructions.saved"));
      setCreating(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("care_instructions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-instructions", familyId] });
      toast.success(t("instructions.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout title={t("instructions.title")}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">{t("instructions.subtitle")}</p>
        <Button onClick={() => setCreating(true)} disabled={!familyId}>
          <Plus className="size-4 mr-2" />
          {t("instructions.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="card-soft p-10 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : !instructions || instructions.length === 0 ? (
        <div className="card-soft p-10 text-center max-w-md mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="size-7" />
          </div>
          <p className="text-muted-foreground mb-6">{t("instructions.empty")}</p>
          <Button onClick={() => setCreating(true)} disabled={!familyId}>
            <Plus className="size-4 mr-2" />
            {t("instructions.add")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {instructions.map((ins) => (
            <article key={ins.id} className="card-soft p-5">
              <header className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-lg leading-tight">{ins.title}</h3>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(ins)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleting(ins)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </header>
              {ins.body ? (
                <div
                  className="rte-content text-sm"
                  dangerouslySetInnerHTML={{ __html: ins.body }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t("instructions.noBody")}</p>
              )}

            </article>
          ))}
        </div>
      )}

      <InstructionDialog
        open={creating || !!editing}
        instruction={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSubmit={(v) => save.mutate(v)}
        saving={save.isPending}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("instructions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("instructions.deleteDesc", { title: deleting?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function InstructionDialog({
  open,
  instruction,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean;
  instruction: Instruction | null;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: { id?: string; title: string; body: string }) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(instruction?.title ?? "");
  const [body, setBody] = useState(instruction?.body ?? "");

  // Reset when dialog opens with new content
  const key = instruction?.id ?? "new";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {instruction ? t("instructions.editTitle") : t("instructions.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("instructions.dialogDesc")}</DialogDescription>
        </DialogHeader>
        <form
          key={key}
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onSubmit({ id: instruction?.id, title: title.trim(), body });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="ins-title">{t("instructions.fieldTitle")}</Label>
            <Input
              id="ins-title"
              defaultValue={instruction?.title ?? ""}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("instructions.titlePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("instructions.fieldBody")}</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder={t("instructions.bodyPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("instructions.editorHint")}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

