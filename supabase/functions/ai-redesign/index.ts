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
    const body = await req.json();
    const imageBase64: string | undefined = body.imageBase64;
    const prompt: string = (body.prompt || "").toString();
    const style: string = (body.style || "modern").toString();
    const products: SelectedProduct[] = Array.isArray(body.products) ? body.products : [];

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 الزامی است" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
        const d = await urlToDataUrl(url);
        if (d) url = d;
      }
      content.push({ type: "image_url", image_url: { url } });
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("AI gateway error:", upstream.status, errText);
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "تعداد درخواست‌ها زیاد است. کمی صبر کنید." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "اعتبار هوش مصنوعی تمام شده. لطفاً شارژ کنید." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "خطا در سرویس هوش مصنوعی" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const b64 = data?.data?.[0]?.b64_json;
    const tip = data?.choices?.[0]?.message?.content || data?.data?.[0]?.text || "";

    if (!b64) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "تصویری دریافت نشد. دوباره تلاش کنید." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ image: `data:image/png;base64,${b64}`, tip }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-redesign error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
