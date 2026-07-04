import { describe, it, expect } from "vitest";
import { runAIDesignPipeline, type DBProduct } from "@/lib/aiPipeline";

// A minimal DB-backed product catalog, exactly as it would come from Supabase.
const dbProducts: Record<string, DBProduct & { price: number }> = {
  "sofa-1": { id: "sofa-1", name: "مبل راحتی", price: 12_000_000, image_url: "sofa.jpg" },
  "lamp-1": { id: "lamp-1", name: "چراغ رومیزی", price: 1_500_000, image_url: "lamp.jpg" },
};

describe("runAIDesignPipeline", () => {
  it("returns status=ok and DB-enriched placements for a valid response", () => {
    const raw = {
      consultation: "چیدمان مدرن پیشنهاد شد",
      placements: [
        { product_id: "sofa-1", x: 0.5, y: 0.6, scale: 1.0 },
        { product_id: "lamp-1", x: 0.2, y: 0.3, scale: 0.8 },
      ],
    };

    const result = runAIDesignPipeline(raw, dbProducts);

    expect(result.status).toBe("ok");
    expect(result.placements).toHaveLength(2);
    expect(result.placements[0].product.name).toBe("مبل راحتی");
    // Price truth enforcement: total is SUM(products.price) from DB.
    expect(result.totalPrice).toBe(13_500_000);
  });

  it("rejects any placement whose product_id is not in the DB-backed catalog (no fake products)", () => {
    const raw = {
      consultation: "",
      placements: [
        { product_id: "sofa-1", x: 0.5, y: 0.5, scale: 1.0 },
        { product_id: "fake-hallucinated-id", x: 0.1, y: 0.1, scale: 1.0 },
      ],
    };

    const result = runAIDesignPipeline(raw, dbProducts);

    expect(result.status).toBe("ok");
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].product_id).toBe("sofa-1");
    expect(result.totalPrice).toBe(12_000_000);
  });

  it("ignores any AI-supplied price entirely, even if present in the raw payload", () => {
    const raw = {
      consultation: "",
      placements: [{ product_id: "sofa-1", x: 0.5, y: 0.5, scale: 1.0 }],
      total_price: 999_999_999, // hallucinated/attacker-controlled — must be ignored
    };

    const result = runAIDesignPipeline(raw, dbProducts);

    expect(result.totalPrice).toBe(12_000_000); // DB price, not the AI's number
  });

  it("clamps out-of-range coordinates and scale into their contractual bounds", () => {
    const raw = {
      consultation: "",
      placements: [{ product_id: "sofa-1", x: 5, y: -3, scale: 99 }],
    };

    const result = runAIDesignPipeline(raw, dbProducts);

    expect(result.status).toBe("ok");
    const [p] = result.placements;
    expect(p.xNorm).toBe(1);
    expect(p.yNorm).toBe(0);
    expect(p.scale).toBe(2.0);
  });

  it("returns status=empty for a response missing all fields (defaults apply, nothing to render)", () => {
    const raw = { totally: "not the expected shape" } as unknown;
    const result = runAIDesignPipeline(raw, dbProducts);
    expect(result.status).toBe("empty");
    expect(result.placements).toHaveLength(0);
  });

  it("returns status=invalid when a present field has the wrong type", () => {
    const wrongType = { placements: "not-an-array" } as unknown;
    const result = runAIDesignPipeline(wrongType, dbProducts);
    expect(result.status).toBe("invalid");
  });

  it("returns status=empty when the response has zero valid placements", () => {
    const raw = { consultation: "متاسفانه چیزی پیدا نشد", placements: [] };
    const result = runAIDesignPipeline(raw, dbProducts);
    expect(result.status).toBe("empty");
    expect(result.placements).toHaveLength(0);
    expect(result.totalPrice).toBe(0);
  });

  it("passes through a server-flagged fallback response as status=empty (never crashes)", () => {
    const raw = { consultation: "متأسفانه امکان تحلیل نبود", placements: [], fallback: true };
    const result = runAIDesignPipeline(raw, dbProducts);
    expect(result.status).toBe("empty");
  });

  it("never throws on completely garbage input", () => {
    expect(() => runAIDesignPipeline(null, dbProducts)).not.toThrow();
    expect(() => runAIDesignPipeline(undefined, dbProducts)).not.toThrow();
    expect(() => runAIDesignPipeline("a string", dbProducts)).not.toThrow();
    expect(() => runAIDesignPipeline(42, dbProducts)).not.toThrow();
    expect(runAIDesignPipeline(null, dbProducts).placements).toHaveLength(0);
  });

  it("deduplicates repeated product_ids in a single response", () => {
    const raw = {
      consultation: "",
      placements: [
        { product_id: "sofa-1", x: 0.1, y: 0.1, scale: 1.0 },
        { product_id: "sofa-1", x: 0.9, y: 0.9, scale: 1.5 },
      ],
    };
    const result = runAIDesignPipeline(raw, dbProducts);
    expect(result.placements).toHaveLength(1);
  });
});
