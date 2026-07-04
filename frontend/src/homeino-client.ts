// ============================================================
// Homeino — Frontend API Client
// TypeScript client for interacting with the Homeino backend
// ============================================================
//
// USAGE:
//   import { homeinoApi } from "./lib/homeino-client";
//   const result = await homeinoApi.decorateRoom(imageBase64, products, budget);

export interface Product {
  id: string;
  name: string;
  category: string;
  style: string;
  price: number;
  width?: number;
  height?: number;
  depth?: number;
  image_url?: string;
  ai_ready_url?: string;
  tags?: string[];
}

export interface Placement {
  product_id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  confidence: number;
  reason: string;
}

export interface DecorationResult {
  consultation: string;
  style: string;
  placements: Placement[];
  total_price: number;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  city?: string;
  rating?: number;
  created_at: string;
}

export interface Room {
  id: string;
  user_id: string;
  image_url: string;
  budget?: number;
  created_at: string;
}

export interface Design {
  id: string;
  room_id: string;
  style?: string;
  total_price?: number;
  consultation?: string;
  created_at: string;
  placements?: Placement[];
}

export type UserRole = "user" | "seller" | "admin";

// ============================================================
// Client Class
// ============================================================
class HomeinoClient {
  private supabaseUrl: string;
  private anonKey: string;

  constructor(supabaseUrl: string, anonKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.anonKey = anonKey;
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": this.anonKey,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- Auth ---
  async getSupabaseClient() {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(this.supabaseUrl, this.anonKey);
  }

  // --- Decorator (Gemini) ---
  async decorateRoom(
    imageBase64: string,
    products: Product[],
    budget?: number,
    roomId?: string,
    jwtToken?: string
  ): Promise<DecorationResult> {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/gemini-decorator`,
      {
        method: "POST",
        headers: this.getHeaders(jwtToken),
        body: JSON.stringify({
          image_base64: imageBase64,
          products,
          budget,
          room_id: roomId,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // --- Products ---
  async getProducts(options?: {
    category?: string;
    style?: string;
    maxPrice?: number;
    minPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (options?.category) params.set("category", options.category);
    if (options?.style) params.set("style", options.style);
    if (options?.maxPrice) params.set("max_price", String(options.maxPrice));
    if (options?.minPrice) params.set("min_price", String(options.minPrice));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${this.supabaseUrl}/rest/v1/products${params.toString() ? "?" + params.toString() : ""}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
    return response.json();
  }

  // --- Stores ---
  async getStores(): Promise<Store[]> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/stores`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch stores: ${response.status}`);
    return response.json();
  }

  // --- Rooms ---
  async createRoom(imageUrl: string, budget?: number, jwtToken?: string): Promise<Room> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rooms`, {
      method: "POST",
      headers: this.getHeaders(jwtToken),
      body: JSON.stringify({
        image_url: imageUrl,
        budget: budget || null,
      }),
    });
    if (!response.ok) throw new Error(`Failed to create room: ${response.status}`);
    return response.json();
  }

  // --- Designs ---
  async createDesign(
    roomId: string,
    style?: string,
    totalPrice?: number,
    consultation?: string,
    jwtToken?: string
  ): Promise<Design> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/designs`, {
      method: "POST",
      headers: this.getHeaders(jwtToken),
      body: JSON.stringify({
        room_id: roomId,
        style: style || null,
        total_price: totalPrice || 0,
        consultation: consultation || null,
      }),
    });
    if (!response.ok) throw new Error(`Failed to create design: ${response.status}`);
    return response.json();
  }

  // --- Placements ---
  async createPlacement(
    designId: string,
    placement: Placement,
    jwtToken?: string
  ): Promise<void> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/placements`, {
      method: "POST",
      headers: this.getHeaders(jwtToken),
      body: JSON.stringify({
        design_id: designId,
        product_id: placement.product_id,
        x: placement.x,
        y: placement.y,
        scale: placement.scale,
        rotation: placement.rotation,
        confidence: placement.confidence,
        reason: placement.reason,
      }),
    });
    if (!response.ok) throw new Error(`Failed to create placement: ${response.status}`);
  }

  async saveFullDesign(
    roomId: string,
    result: DecorationResult,
    jwtToken: string
  ): Promise<Design> {
    // Create the design
    const design = await this.createDesign(
      roomId,
      result.style,
      result.total_price,
      result.consultation,
      jwtToken
    );

    // Create all placements
    for (const placement of result.placements) {
      await this.createPlacement(design.id, placement, jwtToken);
    }

    return design;
  }
}

// ============================================================
// Singleton Export
// ============================================================
let instance: HomeinoClient | null = null;

export function initHomeino(supabaseUrl: string, anonKey: string): HomeinoClient {
  if (!instance) {
    instance = new HomeinoClient(supabaseUrl, anonKey);
  }
  return instance;
}

export function getHomeinoClient(): HomeinoClient {
  if (!instance) {
    throw new Error(
      "HomeinoClient not initialized. Call initHomeino(supabaseUrl, anonKey) first."
    );
  }
  return instance;
}

export { HomeinoClient };