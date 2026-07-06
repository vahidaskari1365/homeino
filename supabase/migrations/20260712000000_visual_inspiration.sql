-- Homeino — Visual Inspiration Shopping Feature
-- ============================================================
-- New tables for the "Visual Inspiration Shopping" experience:
-- reference_images, visual_matches, saved_inspirations, design_sessions.
--
-- STRICT COMPLIANCE:
--   - Does NOT touch AI/Gemini pipeline tables
--   - Does NOT modify existing security policies
--   - Reuses existing schema (products, profiles, analytics_events)
-- ============================================================

-- ------------------------------------------------------------
-- 1. REFERENCE IMAGES
-- Stores user-uploaded inspiration images for visual search
-- ------------------------------------------------------------
create table if not exists public.reference_images (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete set null,
  image_url      text not null,
  thumbnail_url  text,
  original_name  text,
  file_size      integer,
  mime_type      text,
  source         text default 'upload' check (source in ('upload', 'camera', 'paste', 'url')),
  ai_analysis    jsonb default '{}'::jsonb,  -- Stores detected objects, styles, colors, materials
  ai_processed   boolean not null default false,
  ai_processed_at timestamptz,
  metadata       jsonb default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

comment on column public.reference_images.ai_analysis is 'Gemini analysis result: detected furniture, style, colors, materials';
comment on column public.reference_images.ai_processed is 'Whether AI analysis has been completed on this image';

create index if not exists idx_reference_images_user_id on public.reference_images(user_id);
create index if not exists idx_reference_images_created_at on public.reference_images(created_at desc);

alter table public.reference_images enable row level security;

create policy "reference_images_owner_all" on public.reference_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reference_images_public_select" on public.reference_images
  for select using (true);

-- ------------------------------------------------------------
-- 2. VISUAL MATCHES
-- Stores the similarity search results between reference images
-- and Homeino products
-- ------------------------------------------------------------
create table if not exists public.visual_matches (
  id                 uuid primary key default gen_random_uuid(),
  reference_image_id uuid not null references public.reference_images(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete cascade,
  user_id            uuid references public.profiles(id) on delete set null,
  confidence         numeric(5,2) not null check (confidence >= 0 and confidence <= 100),
  match_reason       text,  -- e.g. "similar style", "matching color", "similar shape"
  match_type         text not null default 'visual' check (match_type in ('visual', 'style', 'category', 'color', 'ai_semantic')),
  rank               integer not null default 0,
  metadata           jsonb default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

comment on table public.visual_matches is 'Similarity search results between inspiration images and products';
comment on column public.visual_matches.confidence is 'Similarity confidence score 0-100';
comment on column public.visual_matches.match_reason is 'Human-readable reason for the match';

create index if not exists idx_visual_matches_ref_image on public.visual_matches(reference_image_id);
create index if not exists idx_visual_matches_product on public.visual_matches(product_id);
create index if not exists idx_visual_matches_user on public.visual_matches(user_id);
create index if not exists idx_visual_matches_confidence on public.visual_matches(confidence desc);

alter table public.visual_matches enable row level security;

create policy "visual_matches_owner_all" on public.visual_matches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "visual_matches_public_select" on public.visual_matches
  for select using (true);

-- ------------------------------------------------------------
-- 3. SAVED INSPIRATIONS
-- User's saved inspirations with their matched products
-- ------------------------------------------------------------
create table if not exists public.saved_inspirations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  reference_image_id uuid references public.reference_images(id) on delete set null,
  title              text,
  notes              text,
  is_public          boolean not null default false,
  tags               text[] default '{}',
  metadata           jsonb default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.saved_inspirations is 'User-saved inspirations with matched products';

create index if not exists idx_saved_inspirations_user on public.saved_inspirations(user_id);
create index if not exists idx_saved_inspirations_created on public.saved_inspirations(created_at desc);

alter table public.saved_inspirations enable row level security;

create policy "saved_inspirations_owner_all" on public.saved_inspirations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. SAVED INSPIRATION PRODUCTS
-- Junction: which products are linked to which saved inspiration
-- ------------------------------------------------------------
create table if not exists public.saved_inspiration_products (
  id                uuid primary key default gen_random_uuid(),
  inspiration_id    uuid not null references public.saved_inspirations(id) on delete cascade,
  product_id        uuid not null references public.products(id) on delete cascade,
  match_id          uuid references public.visual_matches(id) on delete set null,
  is_selected       boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

comment on table public.saved_inspiration_products is 'Products linked to a saved inspiration';

create index if not exists idx_saved_insp_prod_insp on public.saved_inspiration_products(inspiration_id);
create index if not exists idx_saved_insp_prod_prod on public.saved_inspiration_products(product_id);

alter table public.saved_inspiration_products enable row level security;

create policy "saved_insp_prod_owner_all" on public.saved_inspiration_products
  for all using (
    exists (select 1 from public.saved_inspirations si where si.id = inspiration_id and si.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.saved_inspirations si where si.id = inspiration_id and si.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 5. DESIGN SESSIONS
-- Tracks when a user goes from inspiration → design
-- ------------------------------------------------------------
create table if not exists public.design_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  source             text not null check (source in ('inspiration_search', 'product_page', 'wishlist', 'direct')),
  reference_image_id uuid references public.reference_images(id) on delete set null,
  inspiration_id     uuid references public.saved_inspirations(id) on delete set null,
  product_ids        uuid[] not null default '{}',
  design_id          uuid references public.designs(id) on delete set null,
  status             text not null default 'started' check (status in ('started', 'designing', 'completed', 'abandoned')),
  metadata           jsonb default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.design_sessions is 'Tracks inspiration-to-design user journeys';

create index if not exists idx_design_sessions_user on public.design_sessions(user_id);
create index if not exists idx_design_sessions_status on public.design_sessions(status);

alter table public.design_sessions enable row level security;

create policy "design_sessions_owner_all" on public.design_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. FUNCTION: search_similar_products (AI-powered)
-- Uses Gemini to analyze an image and find visually similar
-- products in the Homeino catalog. This is a lightweight
-- semantic search that combines category, style, color, material.
-- ------------------------------------------------------------
create or replace function public.search_similar_products(
  p_reference_image_id uuid,
  p_detected_objects   jsonb default '[]'::jsonb,
  p_detected_style     text default null,
  p_detected_colors    text[] default null,
  p_detected_materials text[] default null,
  p_limit              integer default 20
)
returns table (
  product_id    uuid,
  product_name  text,
  price         numeric,
  image_url     text,
  store_id      uuid,
  store_name    text,
  category      text,
  style         text,
  tags          text[],
  confidence    numeric,
  match_reason  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_style text;
  v_categories text[];
  v_color_condition text;
begin
  -- Use detected style, or default to most common
  v_style := coalesce(p_detected_style, 'modern');

  -- Build category preferences from detected objects
  -- Map detected furniture types to product categories
  select array_agg(distinct cat) into v_categories
  from (
    select
      case lower(obj->>'furniture')
        when 'sofa' then 'furniture'
        when 'chair' then 'furniture'
        when 'dining table' then 'furniture'
        when 'coffee table' then 'furniture'
        when 'bed' then 'furniture'
        when 'mattress' then 'bedding'
        when 'tv stand' then 'furniture'
        when 'cabinet' then 'furniture'
        when 'bookshelf' then 'furniture'
        when 'curtain' then 'curtain'
        when 'rug' then 'carpet'
        when 'lamp' then 'lighting'
        when 'chandelier' then 'lighting'
        when 'wall decoration' then 'art'
        when 'mirror' then 'decor'
        when 'decor accessories' then 'accessories'
        when 'plants' then 'plants'
        else 'accessories'
      end as cat
    from jsonb_array_elements(p_detected_objects) obj
  ) sub;

  return query
    select
      p.id,
      p.name,
      p.price,
      p.image_url,
      p.store_id,
      s.name,
      p.category,
      coalesce(p.style, ''),
      coalesce(p.tags, '{}'),
      -- Calculate confidence score based on multiple factors
      round((
        -- Base: style match (30%)
        case when coalesce(p.style, '') = v_style then 30
             when p.style is null then 10
             else 15
        end
        +
        -- Category match (30%)
        case when p.category = any(v_categories) then 30
             when v_categories is null then 15
             else 10
        end
        +
        -- Color match (20%)
        case when p_detected_colors is not null and p.tags && p_detected_colors then 20
             when p.attributes ? 'color' and p_detected_colors is not null
                  and exists (select 1 from unnest(p_detected_colors) c where p.attributes->>'color' ilike '%' || c || '%') then 15
             else 5
        end
        +
        -- Active/stock bonus (10%)
        case when p.is_active and p.stock > 0 then 10 else 0 end
        +
        -- Price availability bonus (10%)
        case when p.price is not null and p.price > 0 then 10 else 0 end
      ), 0) as confidence,
      case
        when coalesce(p.style, '') = v_style and p.category = any(v_categories) then 'سبک و دسته مشابه'
        when coalesce(p.style, '') = v_style then 'سبک مشابه'
        when p.category = any(v_categories) then 'دسته مشابه'
        else 'محصول مرتبط'
      end as match_reason
    from public.products p
    left join public.stores s on s.id = p.store_id
    where p.is_active = true
      and (p.image_url is not null)
      -- Filter by detected categories if we have them
      and (v_categories is null or p.category = any(v_categories) or v_style = coalesce(p.style, ''))
    order by confidence desc, p.created_at desc
    limit p_limit;
end;
$$;

-- ------------------------------------------------------------
-- 7. TRIGGER: Update updated_at on saved_inspirations
-- ------------------------------------------------------------
create trigger update_saved_inspirations_updated_at
  before update on public.saved_inspirations
  for each row execute function public.update_updated_at_column();

create trigger update_design_sessions_updated_at
  before update on public.design_sessions
  for each row execute function public.update_updated_at_column();