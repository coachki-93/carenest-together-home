import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StorageImage } from "./StorageImage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  userId: string;
  folder: string; // e.g. "children" or "profiles"
  value: string | null;
  onChange: (path: string | null) => void;
  size?: number;
  shape?: "circle" | "rounded";
  label?: string;
}

export function ImageUpload({
  userId,
  folder,
  value,
  onChange,
  size = 112,
  shape = "circle",
  label = "Add photo",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      onChange(path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative overflow-hidden border-2 border-dashed border-lavender-deep bg-lavender flex items-center justify-center transition hover:bg-accent",
          shape === "circle" ? "rounded-full" : "rounded-2xl",
        )}
        style={{ width: size, height: size }}
        aria-label={label}
      >
        {value ? (
          <StorageImage path={value} alt={label} className="w-full h-full object-cover" />
        ) : uploading ? (
          <Loader2 className="size-7 animate-spin text-primary" />
        ) : (
          <Upload className="size-7 text-primary" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          Remove
        </Button>
      )}
    </div>
  );
}
