// ============================================================
// Reusable client-side image validation + processing
// ============================================================
// Used by the avatar upload system (and reusable for any image upload).
// - Validates type & size BEFORE upload.
// - Resizes oversized images while preserving aspect ratio.
// - Compresses to keep uploads small (WebP when supported, else JPEG).
// ============================================================

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

const ACCEPTED_EXT_LABEL = "JPG, PNG یا WEBP";

export interface ImageValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate a file's mime type and size before any upload happens. */
export function validateImageFile(
  file: File,
  maxBytes: number = MAX_AVATAR_BYTES,
): ImageValidationResult {
  if (!file) return { ok: false, error: "فایلی انتخاب نشده است" };
  const type = (file.type || "").toLowerCase();
  if (!ACCEPTED_IMAGE_TYPES.includes(type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return { ok: false, error: `فقط فرمت ${ACCEPTED_EXT_LABEL} مجاز است` };
  }
  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    return { ok: false, error: `حجم فایل نباید بیشتر از ${mb} مگابایت باشد` };
  }
  return { ok: true };
}

export interface ProcessImageOptions {
  maxDimension?: number; // longest edge, px
  quality?: number; // 0..1
}

export interface ProcessedImage {
  blob: Blob;
  contentType: string;
  ext: string;
}

/**
 * Resize (preserving aspect ratio) and compress an image in the browser.
 * Falls back to returning the original file if the canvas API is unavailable
 * (e.g. during SSR / tests) so callers never crash.
 */
export async function processImage(
  file: File,
  { maxDimension = 512, quality = 0.85 }: ProcessImageOptions = {},
): Promise<ProcessedImage> {
  const passthrough = (): ProcessedImage => ({
    blob: file,
    contentType: file.type || "image/jpeg",
    ext: (file.name.split(".").pop() || "jpg").toLowerCase(),
  });

  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return passthrough();
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return passthrough();
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    // Prefer WebP (best compression); fall back to JPEG.
    const supportsWebp = canvas
      .toDataURL("image/webp")
      .startsWith("data:image/webp");
    const contentType = supportsWebp ? "image/webp" : "image/jpeg";
    const ext = supportsWebp ? "webp" : "jpg";

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, contentType, quality),
    );
    if (!blob) return passthrough();
    return { blob, contentType, ext };
  } catch {
    return passthrough();
  }
}
