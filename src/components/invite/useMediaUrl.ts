import { useEffect, useState } from "react";
import { getMedia } from "@/lib/invite-store";

export function useMediaUrl(id?: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    if (!id) {
      setUrl(null);
      return;
    }
    getMedia(id).then((blob) => {
      if (!blob || cancelled) return;
      revoked = URL.createObjectURL(blob);
      setUrl(revoked);
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [id]);

  return url;
}
