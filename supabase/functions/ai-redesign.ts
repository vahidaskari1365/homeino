import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  price?: number;
}

interface RequestBody {
  imageBase64: string;
  style: string;
  prompt: string;
  products: Product[];
}

// Convert image to base64 URL for vision API
function extractBase64FromDataUrl(dataUrl: string): string {
  const matches = dataUrl.match(/;base64,(.+)$/);
  return matches ? matches[1] : dataUrl;
}

// Call OpenAI Vision API to analyze room
async function analyzeRoomWithVision(imageBase64: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an interior design AI assistant. Analyze this room image and provide:
1. Room type (living room/bedroom/kitchen/etc)
2. Room dimensions estimate (small/medium/large)
3. Lighting conditions (bright/dim/mixed)
4. Current style (modern/classic/minimal/etc)
5. Color palette
6. Furniture placement suggestions
7. What furniture items are currently in the room (sofas, beds, tables, chairs, etc)

Respond in Persian/Farsi. Keep response concise and structured.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate redesigned image with DALL-E
async function generateRedesignedImage(
  imageBase64: string,
  style: string,
  roomAnalysis: string,
  prompt: string,
  products: Product[]
): Promise<string> {
  // Build detailed prompt for DALL-E
  const productsList = products
    .map(
      (p) =>
        `- ${p.name} (${p.category})${p.price ? ` - ${p.price.toLocaleString("fa-IR")} تومان` : ""}`
    )
    .join("\n");

  const styleMap: Record<string, string> = {
    modern: "Modern/Contemporary",
    classic: "Classic/Traditional",
    minimalist: "Minimalist",
    industrial: "Industrial",
    scandinavian: "Scandinavian",
    luxury: "Luxury/Elegant",
    bohemian: "Bohemian/Eclectic",
    japanese: "Japanese/Zen",
  };

  const detailedPrompt = `
You are an expert interior designer AI with years of experience in realistic 3D visualization.

ORIGINAL ROOM ANALYSIS:
${roomAnalysis}

DESIGN STYLE: ${styleMap[style] || "Modern"}

SELECTED FURNITURE TO ADD:
${productsList || "Keep the room as is with minimal changes"}

USER NOTES: ${prompt || "None"}

TASK: Generate a photorealistic redesigned interior that:
1. Shows the same room from the EXACT same angle and perspective as the original
2. Integrates the selected furniture naturally into the space
3. Maintains the room's lighting, proportions, and architecture
4. Applies the specified design style consistently
5. Creates a cohesive, professional design
6. All selected furniture should be visible and well-positioned
7. Color palette should be harmonious and match the style
8. Lighting should complement the furniture
9. The redesign should look like a professional interior designer's work
10. It should feel achievable and practical, not fantastical

Create a high-quality, magazine-worthy, photorealistic interior design image.
`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: detailedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DALL-E API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data?.[0]?.url || "";
}

// Get all active products from database organized by category
async function getAllProductsByCategory(): Promise<Record<string, Product[]>> {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, image_url, category_id")
    .eq("is_active", true)
    .not("image_url", "is", null);

  if (error || !products) {
    console.error("Database query error:", error);
    return {};
  }

  // Get category information
  const { data: categories } = await supabase
    .from("producer_categories")
    .select("id, name, slug");

  const categoryMap: Record<string, string> = {};
  (categories || []).forEach((cat: any) => {
    categoryMap[cat.id] = cat.name;
  });

  // Group products by category
  const byCat: Record<string, Product[]> = {};
  products.forEach((p: any) => {
    const catName = categoryMap[p.category_id] || "Unknown";
    if (!byCat[catName]) byCat[catName] = [];
    byCat[catName].push({
      id: p.id,
      name: p.name,
      category: catName,
      imageUrl: p.image_url,
      price: p.price,
    });
  });

  return byCat;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { imageBase64, style, prompt, products } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Missing image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Starting AI redesign...");

    // Extract base64 from data URL if needed
    const cleanBase64 = imageBase64.includes(";base64,")
      ? extractBase64FromDataUrl(imageBase64)
      : imageBase64;

    // Step 1: Analyze the room with vision API
    console.log("Analyzing room with Vision API...");
    const roomAnalysis = await analyzeRoomWithVision(cleanBase64);
    console.log("Room analysis complete");

    // Step 2: Generate redesigned image with DALL-E
    console.log("Generating redesigned image...");
    const redesignedImageUrl = await generateRedesignedImage(
      cleanBase64,
      style,
      roomAnalysis,
      prompt,
      products
    );

    if (!redesignedImageUrl) {
      throw new Error("Failed to generate image");
    }

    console.log("Redesign complete");

    // Step 3: Get all available products for reference
    const allProducts = await getAllProductsByCategory();

    return new Response(
      JSON.stringify({
        image: redesignedImageUrl,
        roomAnalysis,
        productsUsed: products.length,
        allAvailableProducts: allProducts,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
