# 🏠 Homeino — AI Interior Design Marketplace

A production-ready AI Interior Design Marketplace platform built on **Supabase** with **Gemini 1.5 Flash** integration. Real furniture marketplace meets AI-powered room decoration.

---

## 🧠 Core Architecture (Mandatory Pipeline)

The ONLY valid data flow from AI to UI. Any other flow is invalid.

```
User uploads room image
        │
        ▼
Supabase storage (room image)
        │
        ▼
Frontend fetches real products from DB (filtered: category, budget, style)
        │
        ▼
Frontend sends → image + DB-backed product list → gemini-decorator Edge Function
        │
        ▼
Gemini 1.5 Flash (AI LAYER)
  → outputs ONLY: product_id, x (0-1), y (0-1), scale (0.5-2.0), notes
        │
        ▼
VALIDATION LAYER (Zod strict schema — unknown fields stripped, invalid shape rejected)
        │
        ▼
SANITIZATION LAYER (product_id must exist in DB-backed catalog + clamp x/y/scale)
        │
        ▼
NORMALIZATION LAYER (canonical 0-1 coordinates, device-independent)
        │
        ▼
DATABASE ENRICHMENT (Supabase is the ONLY source of truth for name/price/image)
        │
        ▼
PIXEL-PERFECT RENDER ENGINE (src/lib/overlayGeometry.ts + src/components/ProductOverlay.tsx)
  → normalized coords mapped to the image's actual rendered pixel box
  → deterministic across mobile/tablet/desktop, no percentage-based drift
```

### Key Principles
- ✅ **Real products only** — no fake/generated products; unknown `product_id` is rejected, never rendered
- ✅ **No image generation** — Gemini never modifies the room image
- ✅ **API keys stay on server** — stored in Supabase Edge Function env variables
- ✅ **Product filtering before AI** — max 50 products sent to Gemini
- ✅ **Price is DB-only** — AI price output is ignored; total is always `SUM(products.price)` from Supabase
- ✅ **Pixel-perfect overlay rendering** — normalized 0-1 AI coordinates are mapped to real pixel space using the image's rendered/natural size (no viewport-unit or raw-percentage positioning)
- ✅ **AI → UI never coupled directly** — every AI response passes through Validation → Sanitization → Normalization → DB Enrichment (`src/lib/aiPipeline.ts`) before it ever reaches a render component
- ✅ **Reliability** — retry (max 2 attempts), 30s timeout, per-user rate limiting, fallback state on invalid/empty output, full audit trail in `ai_logs`

---

## 📁 Project Structure

```
homeino/
├── supabase/
│   ├── config.toml                    # Supabase project config
│   ├── migrations/                    # Full DB schema + RLS + ai_logs audit table
│   └── functions/
│       ├── gemini-decorator/          # AI placement pipeline (Validation + Sanitization + DB pricing)
│       │   ├── deno.json
│       │   ├── import_map.json
│       │   └── index.ts
│       ├── ai-redesign/               # Full-image style redesign (separate feature, no placement/pricing decisions)
│       ├── inspiration-ai-processor/
│       ├── inspiration-crawler/
│       └── inspiration-cron/
├── src/
│   ├── lib/
│   │   ├── aiPipeline.ts              # Validation → Sanitization → Normalization → DB Enrichment (mandatory gate)
│   │   └── overlayGeometry.ts         # Pixel-perfect coordinate mapping (natural image size + ResizeObserver)
│   ├── components/
│   │   └── ProductOverlay.tsx         # UI Render Engine — renders ONLY pipeline-validated, DB-enriched placements
│   └── pages/
│       └── AIDesign.tsx               # Main AI design flow (upload → AI → pipeline → render)
└── ...
```

---

## 🔐 Security & Reliability

- JWT authentication required for all user-specific Edge Function calls
- API keys stored ONLY in Supabase environment variables, never client-side
- Row Level Security (RLS) enabled on every table
- AI cannot modify images — it only ever returns coordinate/placement data
- Every AI interaction is logged to `ai_logs` for audit (non-fatal if logging fails)
- Per-user rate limiting on AI requests
- Retry (max 2 attempts) + 30s timeout on every Gemini call
- Structurally invalid or empty AI output degrades to a safe fallback state — it never crashes the UI

---

## 📊 Key Performance Indicators

- **Designs per user** — engagement metric
- **Products per design** — AI recommendation quality
- **Response latency** — Edge Function p95 response time
- **Budget adherence** — % of designs under user budget
- **Store product count** — marketplace health

---

Built with ❤️ using Supabase, React, TypeScript, and Gemini 1.5 Flash
