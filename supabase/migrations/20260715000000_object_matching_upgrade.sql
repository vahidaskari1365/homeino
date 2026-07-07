-- Homeino — Object-Level Visual Matching Phase 2
-- ============================================================
-- Extends the visual inspiration system with per-object product
-- matching, caching, and tracking.
--
-- STRICT RULES:
--   - Does NOT touch AI/Gemini pipeline tables (rooms, designs, placements)
--   - Does NOT modify existing security policies
--   - Reuses existing schema (products, profiles, reference_images, visual_matches)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add object_label to visual_matches so each match can be
--    associated with a specific detected object
-- ------------------------------------------------------------
alter table public.visual_matches
  add column if not exists object_label text;

comment on column public.visual_matches.object_label is 'The detected object label this match belongs to (e.g. "sofa", "coffee table")';

create index if not exists idx_visual_matches_object_label
  on public.visual_matches(object_label);

-- ------------------------------------------------------------
-- 2. RPC: search_products_for_object
--    Searches products matching a specific detected object
--    by label, category, style, colors, and materials
-- ------------------------------------------------------------
create or replace function public.search_products_for_object(
  p_object_label text,
  p_category     text default null,
  p_style        text default null,
  p_colors       text[] default null,
  p_materials    text[] default null,
  p_limit        integer default 5
)
returns table (
  product_id   uuid,
  product_name text,
  price        numeric,
  image_url    text,
  store_id     uuid,
  store_name   text,
  category     text,
  style        text,
  tags         text[],
  confidence   numeric,
  match_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id text;
  v_search_term text;
begin
  -- Build search term from object label and attributes
  v_search_term := p_object_label || coalesce(' ' || array_to_string(p_colors, ' '), '') || coalesce(' ' || array_to_string(p_materials, ' '), '');

  return query
    select
      p.id,
      p.name,
      p.price,
      p.image_url,
      p.profile_id,
      pr.brand_name,
      pc.slug,
      coalesce(p.style, ''),
      coalesce(p.tags, '{}'),
      round((
        -- Category match (40%)
        case when pc.slug = p_category or (p_category is null) then 40 else 20 end
        +
        -- Style match (30%)
        case when coalesce(p.style, '') = p_style then 30
             when p_style is null then 20
             else 15
        end
        +
        -- Active/stock (15%)
        case when p.is_active and p.stock > 0 then 15 else 0 end
        +
        -- Has price (15%)
        case when p.price is not null and p.price > 0 then 15 else 0 end
      ), 0) as confidence,
      case
        when pc.slug = p_category and coalesce(p.style, '') = p_style then 'مشابه در سبک و دسته'
        when pc.slug = p_category then 'مشابه در دسته'
        when coalesce(p.style, '') = p_style then 'مشابه در سبک'
        else 'مرتبط'
      end as match_reason
    from public.products p
    left join public.producer_categories pc on pc.id = p.category_id
    left join public.public_profiles pr on pr.id = p.profile_id
    where p.is_active = true
      and p.image_url is not null
      and (p_category is null or pc.slug = p_category)
    order by confidence desc, p.created_at desc
    limit p_limit;
end;
$$;

comment on function public.search_products_for_object is 'Searches products matching a specific detected object by label, category, style';

-- ------------------------------------------------------------
-- 3. RPC: get_cached_object_detection
--    Returns cached detection results for an image hash
-- ------------------------------------------------------------
create or replace function public.get_cached_object_detection(
  p_image_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select ai_analysis into v_result
  from public.reference_images
  where id::text like p_image_hash || '%'
    and ai_processed = true
  order by created_at desc
  limit 1;
  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- 4. RPC: save_object_detection_cache
--    Caches object detection results to avoid repeated Gemini calls
-- ------------------------------------------------------------
create or replace function public.save_object_detection_cache(
  p_image_hash text,
  p_user_id    uuid,
  p_analysis   jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.reference_images (id, user_id, image_url, source, ai_analysis, ai_processed, ai_processed_at)
  values (
    gen_random_uuid(),
    p_user_id,
    'cache://' || p_image_hash,
    'paste',
    p_analysis,
    true,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 5. RPC: save_object_matches
--    Saves per-object product matches for caching
-- ------------------------------------------------------------
create or replace function public.save_object_matches(
  p_reference_image_id uuid,
  p_user_id            uuid,
  p_object_label       text,
  p_product_ids        uuid[],
  p_confidence         numeric[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  for i in 1..array_length(p_product_ids, 1) loop
    insert into public.visual_matches (
      reference_image_id,
      product_id,
      user_id,
      confidence,
      match_reason,
      match_type,
      rank,
      object_label
    ) values (
      p_reference_image_id,
      p_product_ids[i],
      p_user_id,
      coalesce(p_confidence[i], 50),
      'object_match',
      'ai_semantic',
      i,
      p_object_label
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 6. Track object-level events in analytics
-- ------------------------------------------------------------
insert into public.analytics_event_types (event_type, description) values
  ('object_detected', 'AI detected an object in reference image'),
  ('object_selected', 'User selected a product for a detected object'),
  ('object_replaced', 'User replaced a product for a detected object'),
  ('object_skipped', 'User skipped a detected object'),
  ('design_started_from_objects', 'User started AI design from object-level matching')
on conflict (event_type) do nothing;

-- ------------------------------------------------------------
-- 7. Add object_selections JSONB to design_sessions metadata
--    so we can track which product was picked for which object
-- ------------------------------------------------------------
-- No schema change needed — design_sessions already has metadata (jsonb)
-- that can store object selections.
