// ============================================================
// Reusable Supabase Storage upload service (single source of truth)
// ============================================================
// One place for all Storage uploads so there is no duplicated upload logic.
// Uploads happen with real progress via XHR (supabase-js `upload` has no
// progress events), with a graceful fallback to the SDK client.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { processImage, type ProcessImageOptions } from "@/lib/imageProcessing";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

export interface UploadImageParams {
  bucket: string;
  /** Object path inside the bucket, e.g. `${userId}/avatar_123.webp`. */
  path: string;
  blob: Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Low-level upload with real progress + upsert. Returns the public URL. */
export async function uploadToBucket({
  bucket,
  path,
  blob,
  contentType,
  onProgress,
  signal,
}: UploadImageParams): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("نشست شما منقضی شده است. دوباره وارد شوید.");

  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "3600");
    if (contentType) xhr.setRequestHeader("content-type", contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`آپلود ناموفق بود (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("خطای شبکه در هنگام آپلود"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(blob);
  }).catch(async (err) => {
    // Fallback to SDK if XHR path fails for a non-abort reason.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { upsert: true, contentType });
    if (error) throw new Error(error.message);
    onProgress?.(100);
  });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export interface ProcessAndUploadParams {
  bucket: string;
  userId: string;
  file: File;
  /** File name (without folder) — defaults to a timestamped name. */
  fileName?: string;
  process?: ProcessImageOptions;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Validate-free helper (caller validates) that processes then uploads an image. */
export async function processAndUploadImage({
  bucket,
  userId,
  file,
  fileName,
  process,
  onProgress,
  signal,
}: ProcessAndUploadParams): Promise<string> {
  const processed = await processImage(file, process);
  const name = fileName ?? `${Date.now()}.${processed.ext}`;
  const path = `${userId}/${name}`;
  const publicUrl = await uploadToBucket({
    bucket,
    path,
    blob: processed.blob,
    contentType: processed.contentType,
    onProgress,
    signal,
  });
  // Cache-bust so replaced images refresh immediately in <img>.
  return `${publicUrl}?v=${Date.now()}`;
}

/** Remove every object under a user's folder in a bucket (used by "remove avatar"). */
export async function removeUserFolder(
  bucket: string,
  userId: string,
): Promise<void> {
  const { data: list, error } = await supabase.storage
    .from(bucket)
    .list(userId, { limit: 100 });
  if (error) throw new Error(error.message);
  if (!list || list.length === 0) return;
  const paths = list.map((f) => `${userId}/${f.name}`);
  const { error: rmErr } = await supabase.storage.from(bucket).remove(paths);
  if (rmErr) throw new Error(rmErr.message);
}
