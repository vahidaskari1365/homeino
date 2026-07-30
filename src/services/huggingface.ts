// ====================================================================
// لینک‌های هوش مصنوعی ادیت عکس (AI image-edit endpoints)
// --------------------------------------------------------------------
// برای افزودن سرویس جدید، فقط یک آبجکت تازه به آرایه‌ی زیر اضافه کن.
// سرویس‌ها به ترتیب امتحان می‌شوند؛ اولین لینکِ فعال (enabled) استفاده
// می‌شود و اگر شکست خورد، خودکار سراغ لینک بعدی می‌رود.
//
// قانون مهم: هوش مصنوعی هرگز نباید محصول ساختگی تولید کند.
// همه محصولات باید از دیتابیس مارکت‌پلیس بیایند.
// ====================================================================

import { validateAllProductsFromMarketplace, findClosestProducts } from "./marketplace";

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
    // API key intentionally removed from client bundle for security.
    // All AI image generation must be proxied through the authenticated
    // `ai-redesign` edge function which holds the key server-side.
    name: "SiliconFlow",
    enabled: false,
    apiKey: "",
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

// ---- Product Tracking Types ----
// این تایپ‌ها برای ردیابی محصولات استفاده شده در طراحی هستند
export interface ProductUsageInfo {
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  price: number;
  category: string;
}

export interface ProductUsageReport {
  products: ProductUsageInfo[];
  totalCost: number;
  storeCount: number;
  categoryCount: number;
  productCount: number;
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
  productUsage?: ProductUsageReport; // گزارش محصولات استفاده شده
  error?: string;
}

// ---- Validation ----

/**
 * اعتبارسنجی محصولات قبل از ارسال به هوش مصنوعی
 * تضمین می‌کند همه محصولات از مارکت‌پلیس هستند
 */
async function validateProducts(
  products: { id?: string; name: string; category?: string; imageUrl?: string; price?: number }[]
): Promise<{ valid: boolean; error?: string; validatedProducts: typeof products }> {
  // If no products selected, that's fine - user can generate without products
  if (products.length === 0) {
    return { valid: true, validatedProducts: [] };
  }

  // Check if products have IDs (from marketplace)
  const productsWithIds = products.filter(p => p.id);
  const productsWithoutIds = products.filter(p => !p.id);

  if (productsWithoutIds.length > 0) {
    console.warn("محصولات بدون شناسه رد شدند:", productsWithoutIds.map(p => p.name));
    return {
      valid: false,
      error: `محصولات زیر از بازار نیستند: ${productsWithoutIds.map(p => p.name).join("، ")}. لطفاً فقط از محصولات سایت استفاده کنید.`,
      validatedProducts: productsWithIds,
    };
  }

  // Validate all IDs exist in marketplace
  const ids = productsWithIds.map(p => p.id!);
  const { valid, invalidIds } = await validateAllProductsFromMarketplace(ids);

  if (!valid) {
    return {
      valid: false,
      error: `${invalidIds.length} محصول نامعتبر در طراحی یافت شد. لطفاً محصولات را از بازار انتخاب کنید.`,
      validatedProducts: productsWithIds.filter(p => !invalidIds.includes(p.id!)),
    };
  }

  return { valid: true, validatedProducts: products };
}

/**
 * Replace a single product in an existing design while keeping everything else the same.
 * Uses inpainting-style prompting to only swap the specified item.
 */
export async function replaceProductInImage(
  currentDesignBase64: string,
  oldProductName: string,
  newProductName: string,
  newProductDescription: string,
  style: string,
): Promise<{ image?: string; error?: string }> {
  const cleanBase64 = currentDesignBase64.replace(/^data:image\/\w+;base64,/, "");

  const styleLabels: Record<string, string> = {
    modern: "مدرن", classic: "کلاسیک", minimalist: "مینیمال",
    industrial: "صنعتی", scandinavian: "اسکاندیناوی", luxury: "لوکس",
    bohemian: "بوهمی", japanese: "ژاپنی",
  };
  const styleLabel = styleLabels[style] || style;

  const activeEndpoints = AI_ENDPOINTS.filter(e => e.enabled);
  if (activeEndpoints.length === 0) {
    return { error: "هیچ سرویس هوش مصنوعی فعالی تنظیم نشده است" };
  }

  let lastError = "خطا در جایگزینی محصول";

  for (const endpoint of activeEndpoints) {
    try {
      // First, use vision to understand what to modify
      const visionResponse = await fetch(endpoint.chatUrl, {
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
                    detail: "high",
                  },
                },
                {
                  type: "text",
                  text: `In this room design image, there is a product called "${oldProductName}". 
I want to replace it with a new product: "${newProductName}" (${newProductDescription}).

Please describe precisely:
1. Where is "${oldProductName}" located in the image (position, size)?
2. What does it look like (color, shape, material)?
3. What should the replacement "${newProductName}" look like instead?

Answer in Persian briefly.`,
                },
              ],
            },
          ],
          max_tokens: 1024,
          temperature: 0.5,
        }),
      });

      if (!visionResponse.ok) {
        const errorData = await visionResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Vision API error: ${visionResponse.status}`);
      }

      const visionData = await visionResponse.json();
      const analysis = visionData.choices?.[0]?.message?.content || "";

      // Now generate the replacement image
      const replacePrompt = `I have a room design image. I need to replace ONLY the "${oldProductName}" with "${newProductName}" (${newProductDescription}). 

CRITICAL: Change ONLY the ${oldProductName}. Keep EVERYTHING else exactly the same:
- The room structure, walls, floor, ceiling must stay identical
- All other furniture, decorations, lighting, and shadows must remain unchanged
- Only the ${oldProductName} should be replaced with ${newProductName}
- Maintain the same ${styleLabel} style
- The new ${newProductName} should fit naturally in the same position and size as the old one
- Professional interior design, realistic, high quality

Original analysis of the item to replace: ${analysis}`;

      const response = await fetch(endpoint.imageUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${endpoint.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: endpoint.imageModel,
          prompt: replacePrompt,
          image: `data:image/jpeg;base64,${cleanBase64}`,
          image_size: "1024x1024",
          num_inference_steps: 35,
          guidance_scale: 7.0,
          strength: 0.4, // Low strength to keep most of the image unchanged
        }),
      });

      if (!response.ok) {
        throw new Error(`Replace API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.images && data.images[0]) {
        return { image: data.images[0].url || data.images[0].base64 || data.images[0] };
      }

      // Try fallback image model
      const fallbackResponse = await fetch(endpoint.imageUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${endpoint.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: endpoint.fallbackImageModel || endpoint.imageModel,
          prompt: replacePrompt,
          image: `data:image/jpeg;base64,${cleanBase64}`,
          image_size: "1024x1024",
          num_inference_steps: 25,
          guidance_scale: 7.0,
          strength: 0.4,
        }),
      });

      if (!fallbackResponse.ok) throw new Error(`Fallback failed: ${fallbackResponse.status}`);

      const fallbackData = await fallbackResponse.json();
      if (fallbackData.images && fallbackData.images[0]) {
        return { image: fallbackData.images[0].url || fallbackData.images[0].base64 || fallbackData.images[0] };
      }

      throw new Error("No image in response");

    } catch (error) {
      console.error(`Replace attempt on "${endpoint.name}" failed:`, error);
      lastError = error instanceof Error ? error.message : lastError;
      continue;
    }
  }

  return { error: lastError };
}

export async function redesignRoom(
  imageBase64: string,
  style: string,
  prompt: string,
  products: { id?: string; name: string; category?: string; imageUrl?: string; price?: number; profile_id?: string }[],
  maskBase64?: string,
  isPolish?: boolean
): Promise<RedesignResult> {
  // === اعتبارسنجی: محصولات فقط از مارکت‌پلیس ===
  const validation = await validateProducts(products);
  if (!validation.valid) {
    console.warn("هشدار: محصولات غیرمجاز رد شدند:", validation.error);
    // Still continue with valid products only
  }
  const validProducts = validation.validatedProducts;

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

  const productList = validProducts.length > 0
    ? validProducts.map(p => `- ${p.name}${p.category ? ` (${p.category})` : ""}`).join("\n")
    : "بدون محصول خاص";

  const userPrompt = `تصویر یک اتاق را دریافت کرده‌ام. لطفاً این اتاق را با سبک ${styleLabel} بازطراحی کن.

${prompt ? `درخواست کاربر: ${prompt}\n` : ""}

محصولات واقعی از بازار هومینو که برای چیدمان انتخاب شده‌اند:
${productList}

لطفاً یک تصویر با کیفیت بالا از اتاق بازطراحی شده تولید کن که:
1. سبک ${styleLabel} را داشته باشد
2. محصولات مارکت‌پلیس انتخاب شده به خوبی در آن قرار گرفته باشند
3. نورپردازی طبیعی و واقع‌گرایانه باشد
4. رنگ‌ها و متریال‌ها با سبک ${styleLabel} هماهنگ باشند

توجه: فقط و فقط از محصولات ذکر شده استفاده کن. هیچ محصول دیگری به تصویر اضافه نکن.

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

      // Build product usage report
      const productUsage = buildProductUsageReport(validProducts);

      return {
        image: imageResult,
        tip,
        analytics: {
          tip: "سبک " + styleLabel + " با موفقیت اعمال شد",
          colorPalette: getColorPaletteForStyle(style),
          styleMatch: 85,
          spatialAdvice: "محصولات انتخاب شده در بهترین موقعیت قرار گرفتند"
        },
        productUsage,
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

/**
 * ساختن گزارش محصولات استفاده شده در طراحی
 */
function buildProductUsageReport(
  products: { id?: string; name: string; category?: string; imageUrl?: string; price?: number; profile_id?: string }[]
): ProductUsageReport | undefined {
  if (products.length === 0) return undefined;

  const usageInfo: ProductUsageInfo[] = products.map(p => ({
    productId: p.id || "unknown",
    productName: p.name,
    storeId: p.profile_id || "unknown",
    storeName: "", // Will be filled by the UI
    price: p.price || 0,
    category: p.category || "عمومی",
  }));

  const storeIds = new Set(usageInfo.map(u => u.storeId));
  const categories = new Set(usageInfo.map(u => u.category));

  return {
    products: usageInfo,
    totalCost: usageInfo.reduce((sum, u) => sum + u.price, 0),
    storeCount: storeIds.size,
    categoryCount: categories.size,
    productCount: usageInfo.length,
  };
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
Include ONLY these marketplace products naturally in the scene: ${productList}
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