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
- ✅ **Strict CORS origin validation** — all Edge Functions validate request Origin against allowed domains (production Supabase URL + localhost); wildcard `*` is never used in production
- ✅ **AI → UI never coupled directly** — every AI response passes through Validation → Sanitization → Normalization → DB Enrichment (`src/lib/aiPipeline.ts`) before it ever reaches a render component
- ✅ **Reliability** — retry (max 2 attempts), 30s timeout, per-user rate limiting, fallback state on invalid/empty output, full audit trail in `ai_logs`

### One Unified AI Strategy

Homeino uses exactly **one** user-facing AI system. No duplicate or alternate AI providers exist in the product flow:

| Layer | Provider | Purpose | User-facing |
|---|---|---|---|
| AI CORE | **Gemini 1.5 Flash** (`gemini-decorator`) | Product placement + design reasoning (AIDesign pipeline) | ✅ Yes |
| AI FALLBACK | **Zhipu GLM-4V** (`gemini-decorator`) | Fallback when Gemini is unavailable or fails — same validation/sanitization pipeline | ✅ Yes (transparent to user) |
| DATABASE | **Supabase** | Sole source of truth for product name/price/image | — |
| RENDER ENGINE | Overlay (`overlayGeometry.ts` + `ProductOverlay.tsx`) | Pixel-perfect placement rendering | ✅ Yes |
| OPTIONAL BACKGROUND AI | Zhipu GLM-4V (`inspiration-ai-processor`) | Non-user-facing cron job that auto-tags/translates crawled inspiration gallery images (title, style, tags, palette). Never touches product placement, pricing, or the render pipeline. | ❌ No (cron/admin only) |

Removed as part of the architecture cleanup (dead, unused, or UX-deceptive — no longer present in the codebase):
- ❌ `ai-redesign` Edge Function (Zhipu/CogView full-image generation) — not wired into any UI flow
- ❌ `src/services/huggingface.ts` and `src/services/siliconFlow.ts` — unused duplicate AI providers (SiliconFlow client-side API key), only consumed by the dead redesign section below
- ❌ `AIDesignSection.tsx`, `BeforeAfterSlider.tsx`, `MaskCanvas.tsx` — orphaned UI for the removed image-generation redesign flow (not rendered on any page)
- ❌ `ChatBot.tsx` — keyword/if-else responder with no real LLM behind it; removed to avoid presenting fake AI capability to users

---

## 📁 Project Structure

```
homeino/
├── supabase/
│   ├── config.toml                    # Supabase project config
│   ├── migrations/                    # Full DB schema + RLS + ai_logs audit table
│   └── functions/
│       ├── gemini-decorator/          # THE core AI pipeline: Validation + Sanitization + DB pricing
│       │   ├── index.ts               # Entry point — auth, rate limiting, orchestration
│       │   └── _shared/
│       │       ├── cors.ts            # Strict CORS origin validation
│       │       ├── types.ts           # Shared interfaces (ProductInput, PlacementOutput, etc.)
│       │       ├── validation.ts      # Zod schemas, sanitization, helpers
│       │       ├── productSelection.ts # Budget-aware product selection
│       │       ├── aiProviders.ts     # Gemini + Zhipu provider logic
│       │       └── prompt.ts          # Prompt builder
│       ├── inspiration-ai-processor/  # Optional background AI — gallery tagging only, not user-facing
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
