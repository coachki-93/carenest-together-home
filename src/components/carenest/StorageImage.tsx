import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StorageImageProps {
  path: string | null | undefined;
  bucket?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/** Renders a private-bucket file via a signed URL. */
export function StorageImage({
  path,
  bucket = "avatars",
  alt,
  className,
  fallback,
}: StorageImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, bucket]);

  if (!path || !url) {
    return <>{fallback ?? <div className={cn("bg-muted", className)} />}</>;
  }
  return <img src={url} alt={alt} className={className} />;
}
