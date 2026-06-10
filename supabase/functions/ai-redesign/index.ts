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
    const body = await req.json();
    const imageBase64: string | undefined = body.imageBase64;
    const prompt: string = (body.prompt || "").toString();
    const style: string = (body.style || "modern").toString();
    const products: SelectedProduct[] = Array.isArray(body.products) ? body.products : [];

    console.log("Request payload - Style:", style, "Prompt length:", prompt.length, "Products count:", products.length);
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
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const productList = products
      .filter((p) => p && p.name)
      .map((p, i) => `${i + 1}. ${p.category ? `[${p.category}] ` : ""}${p.name}`)
      .join("\n");

    const fullPrompt = [
      `Redesign this interior space in a ${style} style.`,
      productList
        ? `Place the EXACT following furniture/decor items (provided as reference images) into the room, matching their look, color, material and shape as closely as possible:\n${productList}`
        : "",
      prompt?.trim() ? `Additional request: ${prompt.trim()}` : "",
      "Keep the same room structure, walls, windows, floor and viewpoint. Replace existing furniture only where the new items belong. Photorealistic interior photography, natural lighting, high quality, cohesive composition.",
      "IMPORTANT: Also provide a very brief interior design tip (15 words max) in PERSIAN based on the room's characteristics (light, space, potential). Format your response as a JSON object with 'image' (base64) and 'tip' (string) fields. But actually, since I need the image as a modality, just output the text tip separately if possible, or I will parse it from the text response.",
    ].filter(Boolean).join("\n\n");

    const roomDataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // Build content: text + room image + each product image
    const content: (
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    )[] = [
      { type: "text", text: fullPrompt },
      { type: "image_url", image_url: { url: roomDataUrl } },
    ];

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
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
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
    const b64 = data?.data?.[0]?.b64_json;
    const tip = data?.choices?.[0]?.message?.content || data?.data?.[0]?.text || "";

    if (!b64) {
      console.error("Invalid response: 'b64_json' is missing in response data:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "تصویری از سرویس هوش مصنوعی دریافت نشد. لطفا دوباره تلاش کنید." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully generated design. Base64 length: ${b64.length}, Tip generated: "${tip}"`);

    return new Response(
      JSON.stringify({ image: `data:image/png;base64,${b64}`, tip }),
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