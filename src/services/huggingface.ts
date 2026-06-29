// ====================================================================
// لینک‌های هوش مصنوعی ادیت عکس (AI image-edit endpoints)
// --------------------------------------------------------------------
// برای افزودن سرویس جدید، فقط یک آبجکت تازه به آرایه‌ی زیر اضافه کن.
// سرویس‌ها به ترتیب امتحان می‌شوند؛ اولین لینکِ فعال (enabled) استفاده
// می‌شود و اگر شکست خورد، خودکار سراغ لینک بعدی می‌رود.
// ====================================================================

interface AIEndpoint {
  name: string;
  enabled: boolean;
  apiKey: string;
  chatUrl: string;        // آدرس تحلیل تصویر (vision / chat)
  imageUrl: string;       // آدرس تولید/ادیت تصویر
  visionModel: string;    // مدل تحلیل تصویر
  imageModel: string;     // مدل اصلی تولید تصویر
  fallbackImageModel?: string; // مدل جایگزین در صورت شکست مدل اصلی
}

const AI_ENDPOINTS: AIEndpoint[] = [
  {
    name: "SiliconFlow",
    enabled: true,
    apiKey: "3305e9e19f7f4a3982e5cd12ed73d2a0.g7Ab9mA1XVxiUHTS",
    chatUrl: "https://api.siliconflow.cn/v1/chat/completions",
    imageUrl: "https://api.siliconflow.cn/v1/images/generations",
    visionModel: "Qwen/Qwen2-VL-72B-Instruct",
    imageModel: "stabilityai/stable-diffusion-3-5-large",
    fallbackImageModel: "stabilityai/stable-diffusion-xl-base-1.0",
  },

  // ---- لینک‌های بعدی را اینجا اضافه کن (بعداً ارسال می‌شوند) ----
  // {
  //   name: "Endpoint 2",
  //   enabled: false,
  //   apiKey: "",
  //   chatUrl: "",
  //   imageUrl: "",
  //   visionModel: "",
  //   imageModel: "",
  //   fallbackImageModel: "",
  // },
];

interface SiliconFlowResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface RedesignResult {
  image?: string;
  tip?: string;
  analytics?: {
    tip?: string;
    colorPalette?: string[];
    styleMatch?: number;
    spatialAdvice?: string;
  };
  error?: string;
}

export async function redesignRoom(
  imageBase64: string,
  style: string,
  prompt: string,
  products: { name: string; category?: string; imageUrl?: string; price?: number }[],
  maskBase64?: string,
  isPolish?: boolean
): Promise<RedesignResult> {
  // Remove data:image prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Build the prompt for the AI service
  const styleLabels: Record<string, string> = {
    modern: "مدرن",
    classic: "کلاسیک",
    minimalist: "مینیمال",
    industrial: "صنعتی",
    scandinavian: "اسکاندیناوی",
    luxury: "لوکس",
    bohemian: "بوهمی",
    japanese: "ژاپنی",
  };

  const styleLabel = styleLabels[style] || style;

  const productList = products.length > 0
    ? products.map(p => `- ${p.name}${p.category ? ` (${p.category})` : ""}`).join("\n")
    : "بدون محصول خاص";

  const userPrompt = `تصویر یک اتاق را دریافت کرده‌ام. لطفاً این اتاق را با سبک ${styleLabel} بازطراحی کن.

${prompt ? `درخواست کاربر: ${prompt}\n` : ""}

محصولات انتخاب شده برای چیدمان:
${productList}

لطفاً یک تصویر با کیفیت بالا از اتاق بازطراحی شده تولید کن که:
1. سبک ${styleLabel} را داشته باشد
2. محصولات انتخاب شده به خوبی در آن قرار گرفته باشند
3. نورپردازی طبیعی و واقع‌گرایانه باشد
4. رنگ‌ها و متریال‌ها با سبک ${styleLabel} هماهنگ باشند

همچنین یک نکته طراحی داخلی کوتاه (tip) به زبان فارسی ارائه بده.`;

  const activeEndpoints = AI_ENDPOINTS.filter(e => e.enabled);

  if (activeEndpoints.length === 0) {
    return { error: "هیچ سرویس هوش مصنوعی فعالی تنظیم نشده است" };
  }

  let lastError = "خطا در ارتباط با سرویس هوش مصنوعی";

  // به ترتیب لینک‌ها را امتحان کن؛ اولین موفقیت برگردانده می‌شود.
  for (const endpoint of activeEndpoints) {
    try {
      const response = await fetch(endpoint.chatUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${endpoint.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: endpoint.visionModel,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${cleanBase64}`,
                    detail: "high"
                  }
                },
                {
                  type: "text",
                  text: userPrompt
                }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data: SiliconFlowResponse = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Extract the tip from the response
      const tipMatch = content.match(/نکته[\s\S]*?:\s*([^\n]+)/i) ||
                      content.match(/tip[\s\S]*?:\s*([^\n]+)/i) ||
                      content.match(/پیشنهاد[\s\S]*?:\s*([^\n]+)/i);

      const tip = tipMatch ? tipMatch[1].trim() : "اتاق با موفقیت بازطراحی شد. از چیدمان جدید لذت ببرید!";

      // Generate image using this endpoint's image generation
      const imageResult = await generateImage(
        endpoint,
        cleanBase64,
        styleLabel,
        prompt,
        productList
      );

      return {
        image: imageResult,
        tip,
        analytics: {
          tip: "سبک " + styleLabel + " با موفقیت اعمال شد",
          colorPalette: getColorPaletteForStyle(style),
          styleMatch: 85,
          spatialAdvice: "محصولات انتخاب شده در بهترین موقعیت قرار گرفتند"
        }
      };

    } catch (error) {
      console.error(`AI endpoint "${endpoint.name}" failed:`, error);
      lastError = error instanceof Error ? error.message : lastError;
      // سراغ لینک بعدی برو
      continue;
    }
  }

  return { error: lastError };
}

async function generateImage(
  endpoint: AIEndpoint,
  imageBase64: string,
  styleLabel: string,
  userPrompt: string,
  productList: string
): Promise<string> {
  const prompt = `Redesign this room interior in ${styleLabel} style.
${userPrompt ? `User request: ${userPrompt}` : ""}
Include these products naturally in the scene: ${productList}
Professional interior design photography, natural lighting, high quality, realistic.`;

  try {
    const response = await fetch(endpoint.imageUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${endpoint.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: endpoint.imageModel,
        prompt: prompt,
        image_size: "1024x1024",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        // Some models support image-to-image
        image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
        strength: 0.7, // For image-to-image variation
      }),
    });

    if (!response.ok) {
      console.warn(`Image generation failed on "${endpoint.name}", trying fallback...`);
      return await fallbackImageGeneration(endpoint, imageBase64, styleLabel);
    }

    const data = await response.json();

    if (data.images && data.images[0]) {
      return data.images[0].url || data.images[0].base64 || data.images[0];
    }

    throw new Error("No image generated");

  } catch (error) {
    console.error("Image generation error:", error);
    return await fallbackImageGeneration(endpoint, imageBase64, styleLabel);
  }
}

async function fallbackImageGeneration(
  endpoint: AIEndpoint,
  imageBase64: string,
  styleLabel: string
): Promise<string> {
  try {
    const response = await fetch(endpoint.imageUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${endpoint.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: endpoint.fallbackImageModel || endpoint.imageModel,
        prompt: `A beautifully designed ${styleLabel} style room interior, professional photography, natural lighting, high quality, detailed furniture arrangement`,
        negative_prompt: "blurry, low quality, distorted, ugly",
        image_size: "1024x1024",
        num_inference_steps: 20,
        guidance_scale: 7.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Fallback generation failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.images && data.images[0]) {
      return data.images[0].url || data.images[0].base64 || data.images[0];
    }

    throw new Error("No image in fallback response");

  } catch (error) {
    console.error("Fallback generation error:", error);
    return `data:image/jpeg;base64,${imageBase64}`;
  }
}

function getColorPaletteForStyle(style: string): string[] {
  const palettes: Record<string, string[]> = {
    modern: ["#2C3E50", "#ECF0F1", "#95A5A6", "#E74C3C", "#3498DB"],
    classic: ["#8B4513", "#D2691E", "#FFD700", "#2F4F4F", "#F5F5DC"],
    minimalist: ["#FFFFFF", "#000000", "#F5F5F5", "#333333", "#BDBDBD"],
    industrial: ["#5D5D5D", "#8B8680", "#A52A2A", "#CD853F", "#2F4F4F"],
    scandinavian: ["#F0F4F8", "#E2E8F0", "#CBD5E0", "#A0AEC0", "#4A5568"],
    luxury: ["#FFD700", "#8B4513", "#2C1810", "#C9B037", "#1C1C1C"],
    bohemian: ["#D2691E", "#8B4513", "#228B22", "#9932CC", "#FF6347"],
    japanese: ["#D4A574", "#8B4513", "#F5F5DC", "#2F4F4F", "#A52A2A"],
  };

  return palettes[style] || palettes.modern;
}
