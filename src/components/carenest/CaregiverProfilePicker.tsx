import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import {
  useCaregiverProfiles,
  useSuggestedCaregiverProfile,
  type CaregiverProfile,
} from "@/lib/data/caregiver-profiles";

interface Props {
  familyId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  /** When true, auto-select the suggested profile if value is empty. */
  autoSuggest?: boolean;
  /** Filter to profiles belonging to one account (e.g. the current user). */
  accountUserId?: string;
  label?: string;
}

export function CaregiverProfilePicker({
  familyId,
  value,
  onChange,
  autoSuggest = true,
  accountUserId,
  label,
}: Props) {
  const { t } = useTranslation();
  const profiles = useCaregiverProfiles(familyId);
  const suggested = useSuggestedCaregiverProfile(familyId);

  const available = (profiles.data ?? []).filter(
    (p) => p.is_active && (!accountUserId || p.account_user_id === accountUserId),
  );

  // Auto-suggest once data is loaded
  useEffect(() => {
    if (!autoSuggest) return;
    if (value) return;
    const s = suggested.data;
    if (s && available.some((p) => p.id === s)) {
      onChange(s);
      return;
    }
    if (available.length === 1) onChange(available[0].id);
  }, [autoSuggest, value, suggested.data, available, onChange]);

  if (available.length === 0) return null;

  const isSuggested = (p: CaregiverProfile) => suggested.data === p.id;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">
        {label ?? t("caregiverProfiles.pickerLabel")}
      </Label>
      <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger className="h-11 rounded-xl">
          <SelectValue placeholder={t("caregiverProfiles.pickerPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {available.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ background: p.color }}
                />
                {p.name}
                {isSuggested(p) && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-primary">
                    <Sparkles className="size-3" />
                    {t("caregiverProfiles.onShift")}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
