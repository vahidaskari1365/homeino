// AI Room Redesign — accepts a room photo + a list of selected products
// and asks Gemini image-edit to place those exact items into the room.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SelectedProduct = {
  name: string;
  category?: string;
  imageUrl?: string;
  price?: number;
};

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("------------------- ai-redesign start -------------------");

    // Estimate total payload size before parsing to catch oversized requests early
    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      // Supabase Edge Functions have a ~10 MB physical limit
      if (sizeBytes > 10 * 1024 * 1024) {
        console.error(`Payload too large: ${sizeBytes} bytes exceeds 10 MB limit`);
        return new Response(JSON.stringify({ error: "حجم تصویر ارسالی بیش از حد مجاز است. لطفاً تصویری با حجم کمتر (حداکثر ۱۰ مگابایت) انتخاب کنید." }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const imageBase64: string | undefined = body.imageBase64;
    const prompt: string = (body.prompt || "").toString();
    const style: string = (body.style || "modern").toString();
    const products: SelectedProduct[] = Array.isArray(body.products) ? body.products : [];
    const maskBase64: string | undefined = body.maskBase64;
    const isPolish: boolean = body.isPolish === true;

    console.log("Request payload - Style:", style, "Prompt length:", prompt.length, "Products count:", products.length, "Has mask:", !!maskBase64, "Is polish:", isPolish);
    if (imageBase64) {
      console.log("Request payload - Image length:", imageBase64.length, "Prefix:", imageBase64.substring(0, 30));
    } else {
      console.warn("Request payload - No imageBase64 provided");
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 الزامی است" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Configuration Error: LOVABLE_API_KEY is not defined in environment variables");
      return new Response(JSON.stringify({ 
        error: "کلید API تنظیم نشده است. لطفاً LOVABLE_API_KEY را در تنظیمات Supabase وارد کنید." 
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productList = products
      .filter((p) => p && p.name)
      .map((p, i) => `${i + 1}. ${p.category ? `[${p.category}] ` : ""}${p.name}`)
      .join("\n");

    // Build the system instruction based on mode
    let redesignInstruction = "";
    
    if (isPolish) {
      // Polish mode: refine and enhance the already-generated design
      redesignInstruction = [
        `Refine and polish this AI-generated interior design in a ${style} style.`,
        productList
          ? `The following furniture/decor items should remain in the room:\n${productList}`
          : "",
        prompt?.trim() ? `Additional refinement: ${prompt.trim()}` : "",
        "Improve the lighting, textures, material details, and overall photorealism. Keep the same room structure, walls, windows, floor, viewpoint, and furniture arrangement. Make it look more realistic and professionally designed.",
      ].filter(Boolean).join("\n\n");
    } else if (maskBase64) {
      // Selective replacement mode: only modify masked areas
      redesignInstruction = [
        `Redesign ONLY the masked/painted areas of this interior space in a ${style} style.`,
        productList
          ? `Place the EXACT following furniture/decor items (provided as reference images) into the room, matching their look, color, material and shape as closely as possible:\n${productList}`
          : "",
        prompt?.trim() ? `Additional request: ${prompt.trim()}` : "",
        "CRITICAL: Only modify the areas indicated by the mask image. Keep all other parts of the image exactly as they are - do not change any non-masked region. The mask is provided as a separate image where white/colored areas indicate regions to modify and black areas should remain unchanged. Keep the same room structure, walls, windows, floor and viewpoint.",
      ].filter(Boolean).join("\n\n");
    } else {
      // Standard redesign mode
      redesignInstruction = [
        `Redesign this interior space in a ${style} style.`,
        productList
          ? `Place the EXACT following furniture/decor items (provided as reference images) into the room, matching their look, color, material and shape as closely as possible:\n${productList}`
          : "",
        prompt?.trim() ? `Additional request: ${prompt.trim()}` : "",
        "Keep the same room structure, walls, windows, floor and viewpoint. Replace existing furniture only where the new items belong. Photorealistic interior photography, natural lighting, high quality, cohesive composition.",
      ].filter(Boolean).join("\n\n");
    }

    // Add analytics instruction for standard redesigns (not polish)
    const analyticsInstruction = isPolish ? "" : `
      After generating the image, provide a JSON object with room analytics. Format:
      {
        "tip": "یک نکته طراحی در مورد فضا به فارسی (حداکثر ۲۰ کلمه)",
        "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
        "styleMatch": 85,
        "spatialAdvice": "توصیه‌ای برای چیدمان بهتر فضا به فارسی (حداکثر ۲۰ کلمه)"
      }
      styleMatch is a number 0-100 indicating how well the space matches the ${style} style.
      Provide BOTH the image AND the analytics JSON in your response.
    `;

    const fullPrompt = [
      redesignInstruction,
      analyticsInstruction,
      "IMPORTANT: You must respond with BOTH an image and a text response containing the analytics JSON. The text should be a valid JSON object as specified above.",
    ].filter(Boolean).join("\n\n");

    const roomDataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // Build content: text + room image + (optional mask) + each product image
    const content: (
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    )[] = [
      { type: "text", text: fullPrompt },
      { type: "image_url", image_url: { url: roomDataUrl } },
    ];

    // If mask is provided, include it as an additional image
    if (maskBase64) {
      const maskDataUrl = maskBase64.startsWith("data:")
        ? maskBase64
        : `data:image/png;base64,${maskBase64}`;
      content.push({ type: "image_url", image_url: { url: maskDataUrl } });
      console.log("Mask image added to request content");
    }

    for (const p of products) {
      if (!p?.imageUrl) continue;
      // Try direct URL first (gateway will fetch). If it's already a data URL pass as-is.
      let url = p.imageUrl;
      if (!url.startsWith("data:") && !/^https?:\/\//i.test(url)) continue;
      // For maximum reliability convert remote URL to data URL.
      if (/^https?:\/\//i.test(url)) {
        console.log(`Converting product image URL to base64 data URL: ${url.substring(0, 50)}...`);
        const d = await urlToDataUrl(url);
        if (d) {
          url = d;
          console.log("Successfully converted to base64");
        } else {
          console.warn(`Failed to convert remote image to data URL: ${url}`);
        }
      }
      content.push({ type: "image_url", image_url: { url } });
    }

    console.log(`Sending request to Lovable AI Gateway with model google/gemini-2.0-flash-exp`);
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error(`AI Gateway error (HTTP status: ${upstream.status}):`, errText);
      
      let gatewayErrorMessage = "";
      try {
        const parsed = JSON.parse(errText);
        gatewayErrorMessage = parsed.error?.message || parsed.error || parsed.message || "";
      } catch (e) {
        console.error("Failed to parse Gateway error body as JSON:", e);
      }

      console.log(`Extracted error message from AI Gateway response: "${gatewayErrorMessage}"`);

      let persianError = "";
      if (upstream.status === 429) {
        persianError = "تعداد درخواست‌های ارسالی بیش از حد مجاز است. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.";
        if (gatewayErrorMessage) {
          persianError += ` (جزئیات: ${gatewayErrorMessage})`;
        }
      } else if (upstream.status === 402) {
        persianError = "اعتبار استفاده از سرویس هوش مصنوعی به اتمام رسیده است. لطفاً نسبت به شارژ یا ارتقای اشتراک خود اقدام کنید.";
        if (gatewayErrorMessage) {
          persianError += ` (جزئیات: ${gatewayErrorMessage})`;
        }
      } else {
        persianError = "خطایی در پردازش و طراحی تصویر توسط سرویس هوش مصنوعی رخ داده است. لطفاً دوباره تلاش کنید.";
        if (gatewayErrorMessage) {
          persianError += ` (علت: ${gatewayErrorMessage})`;
        }
      }

      return new Response(JSON.stringify({ error: persianError }), {
        status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    console.log("AI Gateway response received. Keys present in response:", Object.keys(data));
    
    // Gemini 2.0 Multimodal response parsing
    let b64 = "";
    let textContent = "";
    
    const message = data?.choices?.[0]?.message;
    if (message?.content && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "text") {
          textContent = part.text || "";
        } else if (part.type === "image" && part.image?.b64_json) {
          b64 = part.image.b64_json;
        }
      }
    } else if (message?.content && typeof message.content === "string") {
      textContent = message.content;
    }

    // Fallback to old parsing if new one failed
    if (!b64) b64 = data?.data?.[0]?.b64_json || "";
    if (!textContent && data?.data?.[0]?.text) textContent = data.data[0].text;

    if (!b64) {
      console.error("Invalid response: Image data missing in response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "تصویری از سرویس هوش مصنوعی دریافت نشد. لطفا دوباره تلاش کنید." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse analytics JSON from text response (try multiple approaches)
    let analytics: Record<string, unknown> = {};
    let tip = textContent;
    
    if (textContent) {
      try {
        // Try to extract JSON from the text
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          analytics = parsed;
          tip = (parsed.tip as string) || textContent;
        }
      } catch {
        // If parsing fails, use raw text as tip
        console.log("Could not parse JSON from response text, using raw text as tip");
      }
    }

    console.log(`Successfully generated design. Base64 length: ${b64.length}, Tip generated: "${tip?.substring(0, 50)}"`);

    return new Response(
      JSON.stringify({ 
        image: `data:image/png;base64,${b64}`, 
        tip,
        analytics: Object.keys(analytics).length > 0 ? analytics : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Internal server error in ai-redesign function:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});