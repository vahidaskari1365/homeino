import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  processImage,
  MAX_AVATAR_BYTES,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/imageProcessing";

function makeFile(type: string, size: number, name = "x"): File {
  const blob = new Blob([new Uint8Array(Math.max(1, Math.min(size, 1024)))], { type });
  const file = new File([blob], name, { type });
  // Force the reported size without allocating huge buffers.
  // @ts-expect-error `size` is readonly on File, but this is test-only
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("accepts supported image types under the size limit", () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(validateImageFile(makeFile(type, 1024)).ok).toBe(true);
    }
  });

  it("rejects unsupported formats", () => {
    const res = validateImageFile(makeFile("application/pdf", 1024, "doc.pdf"));
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("rejects a GIF (not in the allowed list)", () => {
    expect(validateImageFile(makeFile("image/gif", 1024, "a.gif")).ok).toBe(false);
  });

  it("rejects oversized files (> 5MB)", () => {
    const res = validateImageFile(makeFile("image/png", MAX_AVATAR_BYTES + 1));
    expect(res.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImageFile(makeFile("image/jpeg", MAX_AVATAR_BYTES)).ok).toBe(true);
  });

  it("handles a missing file gracefully", () => {
    // @ts-expect-error intentional: guard against null input
    expect(validateImageFile(null).ok).toBe(false);
  });
});

describe("processImage", () => {
  it("falls back to passthrough when canvas APIs are unavailable (jsdom)", async () => {
    const file = makeFile("image/png", 2048, "avatar.png");
    const processed = await processImage(file, { maxDimension: 256 });
    expect(processed.blob).toBeInstanceOf(Blob);
    expect(processed.contentType).toBeTruthy();
    expect(processed.ext).toBeTruthy();
  });
});
