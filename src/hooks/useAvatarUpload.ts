// @ts-nocheck
// ============================================================
// useAvatarUpload — reusable avatar upload state machine
// ============================================================
// Orchestrates: validate -> instant preview -> process/compress -> upload
// (with progress) -> persist avatar_url on the profile -> refresh.
// Never clears the existing avatar on failure (previous image is preserved).
// ============================================================

import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateImageFile, MAX_AVATAR_BYTES } from "@/lib/imageProcessing";
import { processAndUploadImage, removeUserFolder } from "@/lib/storage";

export type AvatarUploadStatus = "idle" | "uploading" | "success" | "error";

const AVATAR_BUCKET = "avatars";

export interface UseAvatarUploadOptions {
  userId: string;
  /** Called with the new public URL after a successful upload or removal (null). */
  onChange?: (url: string | null) => void;
}

export interface UseAvatarUpload {
  status: AvatarUploadStatus;
  progress: number;
  error: string | null;
  /** Local object-URL preview shown immediately while uploading. */
  preview: string | null;
  uploading: boolean;
  upload: (file: File) => Promise<void>;
  retry: () => Promise<void>;
  remove: () => Promise<void>;
  reset: () => void;
}

export function useAvatarUpload({
  userId,
  onChange,
}: UseAvatarUploadOptions): UseAvatarUpload {
  const [status, setStatus] = useState<AvatarUploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const lastFileRef = useRef<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
  }, []);

  const reset = useCallback(() => {
    clearPreview();
    setStatus("idle");
    setProgress(0);
    setError(null);
    lastFileRef.current = null;
  }, [clearPreview]);

  const upload = useCallback(
    async (file: File) => {
      lastFileRef.current = file;
      setError(null);

      const validation = validateImageFile(file, MAX_AVATAR_BYTES);
      if (!validation.ok) {
        setStatus("error");
        setError(validation.error ?? "فایل نامعتبر است");
        return;
      }

      // Instant preview (does not touch the persisted avatar).
      clearPreview();
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreview(objectUrl);

      setStatus("uploading");
      setProgress(0);

      try {
        const url = await processAndUploadImage({
          bucket: AVATAR_BUCKET,
          userId,
          file,
          fileName: `avatar_${Date.now()}`, // ext added by the service
          process: { maxDimension: 512, quality: 0.85 },
          onProgress: setProgress,
        });

        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: url })
          .eq("id", userId);
        if (dbError) throw new Error(dbError.message);

        setStatus("success");
        setProgress(100);
        clearPreview(); // switch to the persisted public URL
        onChange?.(url);
      } catch (err) {
        // Preserve the previous avatar — do NOT clear it.
        setStatus("error");
        setProgress(0);
        clearPreview();
        setError(err instanceof Error ? err.message : "آپلود ناموفق بود");
      }
    },
    [userId, clearPreview, onChange],
  );

  const retry = useCallback(async () => {
    if (lastFileRef.current) await upload(lastFileRef.current);
  }, [upload]);

  const remove = useCallback(async () => {
    setError(null);
    setStatus("uploading");
    try {
      await removeUserFolder(AVATAR_BUCKET, userId);
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (dbError) throw new Error(dbError.message);
      clearPreview();
      setStatus("idle");
      setProgress(0);
      onChange?.(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "حذف تصویر ناموفق بود");
    }
  }, [userId, clearPreview, onChange]);

  return {
    status,
    progress,
    error,
    preview,
    uploading: status === "uploading",
    upload,
    retry,
    remove,
    reset,
  };
}
