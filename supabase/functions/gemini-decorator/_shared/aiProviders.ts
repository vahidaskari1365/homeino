// ============================================================
// Homeino — AI Provider Layer (Gemini + Zhipu Fallback)
// ============================================================
// Encapsulates all AI model calls. Gemini is the primary provider;
// Zhipu serves as a fallback when Gemini is unavailable or fails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import type { ProductInput, GeminiResponse, PlacementOutput } from "./types.ts";
import {
  RawGeminiResponseSchema,
  GEMINI_TIMEOUT_MS,
  fetchWithTimeout,
  sanitizePlacements,
  computeTotalPrice,
} from "./validation.ts";
import { buildGeminiPrompt } from "./prompt.ts";

// ---- Image Upload Helper (needed for Zhipu which requires a URL) ----

/** Upload base64 image to Supabase Storage and return a public URL */
async function uploadImageForZhipu(imageBase64: string): Promise<string | null> {
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const mimeType = "image/jpeg";
    const bin = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const name = `gemini-decorator/${crypto.randomUUID()}.jpg`;
    const { data: up } = await svc.storage.from("inspiration-images").upload(name, bin, { contentType: mimeType, upsert: false });
    if (up) {
      const { data: { publicUrl } } = svc.storage.from("inspiration-images").getPublicUrl(name);
      return publicUrl;
    }
  } catch (e) { console.error("upload image for Zhipu failed:", e instanceof Error ? e.message : e); }
  return null;
}

// ---- Zhipu Provider ----

/** Calls Zhipu (multi-model) and returns the parsed+validated+sanitized response, or throws */
export async function callZhipuOnce(
  imageBase64: string,
  filteredProducts: ProductInput[],
  budget: number | undefined,
  validProducts: Map<string, ProductInput>
): Promise<GeminiResponse> {
  const apiKey = Deno.env.get("ZHIPU_API_KEY");
  if (!apiKey) throw new Error("ZHIPU_API_KEY not configured");

  const imageUrl = await uploadImageForZhipu(imageBase64);
  if (!imageUrl) throw new Error("Failed to upload image for Zhipu");

  const prompt = buildGeminiPrompt(filteredProducts, budget);
  const models = ["glm-4v", "glm-4v-plus", "glm-4v-flash"];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const res = await fetchWithTimeout(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            }],
          }),
        },
        GEMINI_TIMEOUT_MS
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`Zhipu ${model} failed:`, text);
        lastError = new Error(`Zhipu ${model}: ${text}`);
        continue;
      }

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) { lastError = new Error(`Zhipu ${model}: empty response`); continue; }

      const cleaned = raw.replace(/```json|```/gi, "").trim();
      let parsedJson: unknown;
      try { parsedJson = JSON.parse(cleaned); } catch (e) {
        lastError = new Error(`Zhipu ${model}: JSON parse error: ${e instanceof Error ? e.message : "Unknown"}`);
        continue;
      }

      const validation = RawGeminiResponseSchema.safeParse(parsedJson);
      if (!validation.success) {
        lastError = new Error(`Zhipu ${model}: validation: ${validation.error.message}`);
        continue;
      }

      const placements = sanitizePlacements(validation.data.placements, validProducts);
      const total_price = computeTotalPrice(placements, validProducts);
      return { consultation: validation.data.notes, placements, total_price };
    } catch (e) {
      lastError = e;
      console.error(`Zhipu ${model} error:`, e instanceof Error ? e.message : e);
    }
  }

  throw lastError ?? new Error("All Zhipu models failed");
}

// ---- Gemini Provider ----

/** Calls Gemini once and returns the parsed+validated+sanitized response, or throws on failure */
export async function callGeminiOnce(
  imageBase64: string,
  filteredProducts: ProductInput[],
  budget: number | undefined,
  validProducts: Map<string, ProductInput>,
  apiKey: string
): Promise<GeminiResponse> {
  const geminiPrompt = buildGeminiPrompt(filteredProducts, budget);

  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const geminiBody = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: geminiPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const geminiRes = await fetchWithTimeout(
    geminiUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    },
    GEMINI_TIMEOUT_MS
  );

  if (!geminiRes.ok) {
    const errorText = await geminiRes.text();
    throw new Error(`Gemini API error (${geminiRes.status}): ${errorText}`);
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty Gemini response");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(`Failed to parse Gemini response: ${parseErr instanceof Error ? parseErr.message : "Unknown"}`);
  }

  const validation = RawGeminiResponseSchema.safeParse(parsedJson);
  if (!validation.success) {
    throw new Error(`Gemini response failed schema validation: ${validation.error.message}`);
  }
  const parsed = validation.data;

  const placements = sanitizePlacements(parsed.placements, validProducts);
  const total_price = computeTotalPrice(placements, validProducts);

  return {
    consultation: parsed.notes,
    placements,
    total_price,
  };
}
