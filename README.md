<<<<<<< HEAD
# Welcome to your Lovable project

TODO: Document your project here
=======
# 🏠 Homeino — AI Interior Design Marketplace

A production-ready AI Interior Design Marketplace platform built on **Supabase** with **Gemini 1.5 Flash** integration. Real furniture marketplace meets AI-powered room decoration.

---

## 🧠 Core Architecture

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
Frontend sends → image + product list → gemini-decorator Edge Function
        │
        ▼
Gemini 1.5 Flash analyzes room + selects products + returns placements
        │
        ▼
Frontend renders product overlays on room image (percentage-based positioning)
```

### Key Principles
- ✅ **Real products only** — no fake/generated products
- ✅ **No image generation** — Gemini never modifies the room image
- ✅ **API keys stay on server** — stored in Supabase env variables
- ✅ **Product filtering before AI** — max 50 products sent to Gemini
- ✅ **Overlay-based visualization** — products rendered on top of real room image

---

## 📁 Project Structure

```
homeino/
├── supabase/
│   ├── config.toml                    # Supabase project config
│   ├── migrations/
│   │   └── 001_initial_schema.sql     # Full DB schema + RLS + auto-profiles
│   └── functions/
│       └── gemini-decorator/
│           ├── deno.json              # Edge Function config
│           ├── import_map.json        # Deno import map
│           └── index.ts              # Gemini bridge Edge Function
│
├── frontend/
│   ├── package.json                   # React dependencies
│   └── src/
│       ├── react-app-env.d.ts         # TypeScript env types
│       ├── homeino-client.ts          # API client library
│       ├── ProductOverlay.tsx         # Overlay component (React)
│       └── DecoratePage.tsx           # Main user flow page
│
└── README.md                          # This file
```

---

## 🗄️ Database Schema (7 Tables)

| Table        | Purpose                                    | RLS Policy                          |
|-------------|---------------------------------------------|-------------------------------------|
| `profiles`  | Extends auth.users with roles               | Self-only read/update               |
| `stores`    | Seller storefronts                          | Public read, seller manages own     |
| `products`  | Furniture items (real, no fakes)            | Public read, seller manages own     |
| `rooms`     | User-uploaded room images                   | User-only CRUD                      |
| `designs`   | AI-generated designs per room               | Via user-owned rooms                |
| `placements`| Product overlays on room (x%, y%, scale)    | Via user-owned designs              |
| `ai_logs`   | Audit log for all Gemini interactions       | Owner only                          |

### Roles
- **`user`** — browse products, upload rooms, get AI designs
- **`seller`** — manage stores + products (users + seller rights)
- **`admin`** — full system access

---

## ⚡ Edge Function: `gemini-decorator`

**Endpoint:** `/functions/v1/gemini-decorator`

### Request
```json
{
  "image_base64": "base64-encoded JPEG image",
  "products": [
    {
      "id": "uuid",
      "name": "Modern Sofa",
      "category": "sofa",
      "style": "modern",
      "price": 15000000,
      "width": 200,
      "height": 85,
      "depth": 90,
      "image_url": "https://...",
      "tags": ["modern", "gray", "fabric"]
    }
  ],
  "budget": 50000000,
  "room_id": "optional-uuid"
}
```

### Response
```json
{
  "consultation": "توصیه طراحی به زبان فارسی...",
  "style": "modern",
  "placements": [
    {
      "product_id": "uuid",
      "x": 25.5,
      "y": 40.2,
      "scale": 1.0,
      "rotation": 0,
      "confidence": 0.92,
      "reason": "این مبل مدرن با رنگ خنثی به خوبی در کنار دیوار قرار می‌گیرد..."
    }
  ],
  "total_price": 45000000
}
```

### Auth
- Requires valid Supabase JWT in `Authorization: Bearer <token>` header
- Gemini API key stored in Supabase env (`GEMINI_API_KEY`)

### Security
- `verify_jwt: true` — Supabase validates JWT automatically
- API key never leaves server
- No image modification capability
- Only returns coordinate data for overlay

---

## 🔐 API Contract (Frontend ↔ Backend)

### Products (REST — Supabase Auto API)

| Method | Endpoint              | Auth     | Purpose                        |
|--------|-----------------------|----------|--------------------------------|
| GET    | `/rest/v1/products`   | Public   | List products (filterable)     |
| GET    | `/rest/v1/stores`     | Public   | List stores                    |
| POST   | `/rest/v1/rooms`      | JWT      | Create room                    |
| POST   | `/rest/v1/designs`    | JWT      | Save design                    |
| POST   | `/rest/v1/placements` | JWT      | Save placement                 |

### Filtering Parameters (GET /products)
- `category=eq.sofa` — filter by category
- `style=eq.modern` — filter by style
- `price=lte.50000000` — max price
- `price=gte.1000000` — min price
- `limit=50` / `offset=0` — pagination

### Decoration (Edge Function)

| Method | Endpoint                          | Auth | Purpose                  |
|--------|-----------------------------------|------|--------------------------|
| POST   | `/functions/v1/gemini-decorator`  | JWT  | AI room decoration       |

---

## 🚀 Deployment Guide

### 1. Supabase Setup

```bash
# Link your project
npx supabase link --project-ref tljdihejjoepkcgftian

# Push the schema migration
npx supabase db push

# Set Gemini API key
npx supabase secrets set GEMINI_API_KEY=your_gemini_key_here

# Deploy the Edge Function
npx supabase functions deploy gemini-decorator
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm install
npm start
```

### 3. Environment Variables

| Variable                     | Source                         |
|------------------------------|--------------------------------|
| `REACT_APP_SUPABASE_URL`     | Supabase project settings      |
| `REACT_APP_SUPABASE_ANON_KEY`| Supabase project settings      |
| `GEMINI_API_KEY`             | Google AI Studio (server only) |

---

## 💡 Product Filtering Logic

Before sending to Gemini, the backend/frontend MUST:

1. **Filter by category** — only relevant furniture types
2. **Filter by budget** — only products within user's budget
3. **Filter by style** — optional style preference
4. **Limit to top 20–50 products** — never send full database

This ensures:
- Lower token usage → faster responses
- Better quality placements (focused product selection)
- Lower Gemini API costs

---

## 💰 Business Model

- **Multi-store marketplace** — multiple sellers can list products
- **Product-based pricing** — each product has a fixed price
- **AI-assisted recommendations** — free (drives product discovery)
- **Future:** Commission tracking (2%–8% per sale)
- **Future:** Seller analytics dashboard
- **Future:** Admin commission management

---

## 🖼️ Product Image Rules

- Products can have **ANY background** (store environment, colored, etc.)
- **No background removal required**
- Frontend normalizes display via `object-fit: contain` CSS
- Consistent scaling in overlay system
- Optional `ai_ready_url` for pre-processed images

---

## 🧪 Local Development

```bash
# Setup
git clone https://github.com/vahid-askari1986/homeino.git
cd homeino

# Database
npx supabase start

# Edge Functions (local)
npx supabase functions serve gemini-decorator --env-file .env.local

# Frontend
cd frontend
npm install
npm start
```

---

## 🔒 Security Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Browser    │────▶│  Supabase    │────▶│  Gemini 1.5 Flash│
│  (React)     │     │  Edge Func   │     │  (Google API)    │
│              │◀────│  (Deno)      │◀────│                  │
└─────────────┘     └──────────────┘     └──────────────────┘
       │                    │                     │
       │ JWT               │ GEMINI_API_KEY       │ No image access
       │ Auth               │ (env var only)       │ to modify images
       ▼                    ▼                     ▼
   User Identity        Secure Bridge          Product Placement
```

- JWT authentication for all user-specific operations
- API keys stored ONLY in Supabase environment variables
- Row Level Security (RLS) on every table
- AI cannot modify images — only returns coordinate data
- All AI interactions logged in `ai_logs` for audit

---

## 📊 Key Performance Indicators

- **Designs per user** — engagement metric
- **Products per design** — AI recommendation quality
- **Placement confidence** — average Gemini confidence score
- **Response latency** — Edge Function p95 response time
- **Budget adherence** — % of designs under user budget
- **Store product count** — marketplace health

---

Built with ❤️ using Supabase, React, TypeScript, and Gemini 1.5 Flash
>>>>>>> 487b134 (Initial commit: Homeino AI Interior Design Marketplace - Supabase schema, Gemini Edge Function, React frontend)
