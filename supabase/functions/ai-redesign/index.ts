// AI Room Redesign — using Zhipu AI API
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
    console.log("------------------- Zhipu AI redesign start -------------------");

    const body = await req.json();
    const imageBase64: string | undefined = body.imageBase64;
    const prompt: string = (body.prompt || "").toString();
    const style: string = (body.style || "modern").toString();
    const products: SelectedProduct[] = Array.isArray(body.products) ? body.products : [];

    // Fallback/Default Zhipu AI API Key provided by user
    const ZHIPU_API_KEY = Deno.env.get("ZHIPU_API_KEY") || "3305e9e19f7f4a3982e5cd12ed73d2a0.g7Ab9mA1XVxiUHTS";

    console.log("Request payload - Style:", style, "Prompt:", prompt, "Products count:", products.length);

    const productList = products
      .filter((p) => p && p.name)
      .map((p, i) => `${i + 1}. ${p.category ? `[${p.category}] ` : ""}${p.name}`)
      .join("\n");

    // Phase 1: Call Zhipu AI Chat Completion to generate design details and image prompt
    const chatPrompt = `
      You are an expert interior design AI assistant.
      Generate a professional room redesign concept in the style of "${style}".
      ${productList ? `The redesign should incorporate or match these specific items:\n${productList}` : ""}
      ${prompt?.trim() ? `User's extra requests: ${prompt.trim()}` : ""}

      Provide your response strictly as a JSON object with the following fields:
      {
        "imagePrompt": "A highly detailed English prompt (max 120 words) for a photorealistic text-to-image generator. It should describe a gorgeously designed interior room in '${style}' style, featuring professional photography, clean composition, high-end furniture, and the custom products requested. Do not mention UI elements, keep it focused on the visual scene description.",
        "tip": "A beautiful, helpful interior design tip in Persian (max 15 words) about this specific style/setup.",
        "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
        "styleMatch": 95,
        "spatialAdvice": "A practical spatial arrangement advice in Persian (max 15 words) for this layout."
      }
      Do not include any markdown format tags like \`\`\`json or \`\`\`. Just return raw JSON.
    `;

    console.log("Calling Zhipu AI Chat API (glm-4.5-air)...");
    const chatResponse = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ZHIPU_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.5-air",
        messages: [
          { role: "system", content: "You are a professional interior design JSON generator. Only return raw JSON." },
          { role: "user", content: chatPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      console.error("Zhipu AI Chat API error:", errText);
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.code === "1113" || parsedErr.error?.message?.includes("余额不足")) {
          return new Response(JSON.stringify({
            error: "اعتبار کلید API هوش مصنوعی (Zhipu AI) کافی نیست. لطفاً حساب کاربری خود را شارژ کنید تا طراحی هوشمند فعال شود."
          }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch {}
      throw new Error("خطا در برقراری ارتباط با مدل تحلیل طراحی Zhipu AI");
    }

    const chatData = await chatResponse.json();
    const textContent = chatData.choices?.[0]?.message?.content || "";
    console.log("Raw Zhipu AI text response:", textContent);

    let designResult = {
      imagePrompt: `A beautiful modern living room in ${style} style, photorealistic, interior design photography`,
      tip: "از ترکیب رنگ‌های ملایم و نورپردازی گرم استفاده کنید.",
      colorPalette: ["#ECEAE6", "#D1C7BD", "#A89F91", "#786F63", "#3D3730"],
      styleMatch: 90,
      spatialAdvice: "نور غیرمستقیم را برای ایجاد عمق بیشتر در فضا بکار ببرید."
    };

    try {
      // Clean string if any markdown formatting exists
      let cleanText = textContent.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      designResult = JSON.parse(cleanText);
    } catch (e) {
      console.warn("Failed to parse Zhipu AI JSON response, using fallback details. Error:", e);
    }

    // Phase 2: Generate the redesigned image using Zhipu AI CogView-3-Plus
    console.log("Calling Zhipu AI Image API (cogview-3-plus) with prompt:", designResult.imagePrompt);
    const imageResponse = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ZHIPU_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cogview-3-plus",
        prompt: designResult.imagePrompt,
      }),
    });

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      console.error("Zhipu AI Image API error:", errText);
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.code === "1113" || parsedErr.error?.message?.includes("余额不足")) {
          return new Response(JSON.stringify({
            error: "اعتبار کلید API هوش مصنوعی (Zhipu AI) برای تولید تصویر کافی نیست. لطفاً حساب کاربری خود را شارژ کنید."
          }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch {}
      throw new Error("خطا در تولید تصویر توسط هوش مصنوعی Zhipu AI");
    }

    const imageData = await imageResponse.json();
    const generatedUrl = imageData.data?.[0]?.url;

    if (!generatedUrl) {
      throw new Error("آدرس تصویر تولید شده دریافت نشد");
    }

    console.log("Generated image URL successfully:", generatedUrl);

    // Convert the remote URL to Base64 data URL
    const b64Image = await urlToDataUrl(generatedUrl);
    if (!b64Image) {
      throw new Error("خطا در تبدیل آدرس تصویر به فرمت Base64");
    }

    return new Response(
      JSON.stringify({
        image: b64Image,
        tip: designResult.tip,
        analytics: {
          tip: designResult.tip,
          colorPalette: designResult.colorPalette,
          styleMatch: designResult.styleMatch,
          spatialAdvice: designResult.spatialAdvice,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Internal server error in ai-redesign function:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطای ناشناخته در سرویس هوش مصنوعی" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
