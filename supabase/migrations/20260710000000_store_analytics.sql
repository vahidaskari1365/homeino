-- Homeino — Phase 4: Store Analytics Engine
-- ============================================================
-- Comprehensive analytics for store owners: per-product metrics
-- (Views, AI Recommendations, Clicks, Favorites, CTR, Recommendation
-- Rate) and store-level analytics (Monthly Growth, Popularity Trend,
-- Top Room Types, Top Styles, Top Colors, Top Budgets).
--
-- STRICT COMPLIANCE:
--   - Does NOT touch AI/Gemini pipeline tables directly
--   - Reads from existing tracking data (analytics_events, product_views,
--     wishlists, placements, rooms, profiles)
-- ============================================================

-- ------------------------------------------------------------
-- 1. UPGRADE get_store_product_analytics with CTR, Rec Rate, favorites
-- ------------------------------------------------------------
create or replace function public.get_store_product_analytics(p_store_id uuid)
returns table (
  product_id        uuid,
  product_name      text,
  views             bigint,
  clicks            bigint,
  saves             bigint,
  ai_recommendations bigint,
  ctr               numeric,
  recommendation_rate numeric,
  favorites         bigint,
  last_viewed_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.stores
    where id = p_store_id and (owner_id = auth.uid() or public.is_admin(auth.uid()))
  ) then
    raise exception 'not_authorized';
  end if;

  return query
    select
      p.id,
      p.name,
      coalesce(vw.cnt, 0),
      coalesce(cl.cnt, 0),
      coalesce(sv.cnt, 0),
      coalesce(ai.cnt, 0),
      case when coalesce(vw.cnt, 0) > 0
        then round((coalesce(cl.cnt, 0)::numeric / vw.cnt::numeric) * 100, 2)
        else 0
      end,
      case when coalesce(vw.cnt, 0) > 0
        then round((coalesce(ai.cnt, 0)::numeric / vw.cnt::numeric) * 100, 2)
        else 0
      end,
      coalesce(fv.cnt, 0),
      vw.last_viewed
    from public.products p
    left join lateral (
      select count(*)::bigint as cnt, max(created_at) as last_viewed
      from public.product_views where product_id = p.id
    ) vw on true
    left join lateral (
      select count(*)::bigint as cnt
      from public.analytics_events
      where event_type = 'product_clicked' and entity_type = 'product' and entity_id = p.id
    ) cl on true
    left join lateral (
      select count(*)::bigint as cnt
      from public.wishlists
      where item_type = 'product' and item_id = p.id::text
    ) sv on true
    left join lateral (
      select count(*)::bigint as cnt
      from public.placements where product_id = p.id
    ) ai on true
    left join lateral (
      select count(*)::bigint as cnt
      from public.wishlists
      where item_type = 'product' and item_id = p.id::text
    ) fv on true
    where p.store_id = p_store_id
    order by coalesce(vw.cnt, 0) desc;
end;
$$;

-- ------------------------------------------------------------
-- 2. FUNCTION: get_store_analytics_overview
-- Returns aggregated store-level metrics including monthly growth
-- and popularity trend over the last 12 months.
-- ------------------------------------------------------------
create or replace function public.get_store_analytics_overview(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_total_views bigint;
  v_total_clicks bigint;
  v_total_saves bigint;
  v_total_ai bigint;
  v_products_count bigint;
  v_total_ctr numeric;
  v_monthly_growth numeric;
  v_this_month bigint;
  v_last_month bigint;
  v_popularity_trend jsonb;
begin
  if not exists (
    select 1 from public.stores
    where id = p_store_id and (owner_id = auth.uid() or public.is_admin(auth.uid()))
  ) then
    raise exception 'not_authorized';
  end if;

  -- Count active products
  select count(*) into v_products_count
  from public.products where store_id = p_store_id and is_active = true;

  -- Total views from product_views
  select count(*) into v_total_views
  from public.product_views pv
  join public.products p on p.id = pv.product_id
  where p.store_id = p_store_id;

  -- Total clicks from analytics_events
  select count(*) into v_total_clicks
  from public.analytics_events ae
  join public.products p on p.id = ae.entity_id::uuid
  where ae.event_type = 'product_clicked'
    and ae.entity_type = 'product'
    and p.store_id = p_store_id;

  -- Total saves from wishlists
  select count(*) into v_total_saves
  from public.wishlists w
  join public.products p on p.id::text = w.item_id
  where w.item_type = 'product' and p.store_id = p_store_id;

  -- Total AI recommendations from placements
  select count(*) into v_total_ai
  from public.placements pl
  join public.products p on p.id = pl.product_id
  where p.store_id = p_store_id;

  -- CTR
  v_total_ctr := case when v_total_views > 0
    then round((v_total_clicks::numeric / v_total_views::numeric) * 100, 2)
    else 0 end;

  -- Monthly growth: compare this month's views to last month's
  select count(*) into v_this_month
  from public.product_views pv
  join public.products p on p.id = pv.product_id
  where p.store_id = p_store_id
    and pv.created_at >= date_trunc('month', now());

  select count(*) into v_last_month
  from public.product_views pv
  join public.products p on p.id = pv.product_id
  where p.store_id = p_store_id
    and pv.created_at >= date_trunc('month', now() - interval '1 month')
    and pv.created_at < date_trunc('month', now());

  v_monthly_growth := case when v_last_month > 0
    then round(((v_this_month::numeric - v_last_month::numeric) / v_last_month::numeric) * 100, 2)
    else 0 end;

  -- Popularity trend: monthly view counts for last 12 months
  select jsonb_agg(jsonb_build_object(
    'month', to_char(series.month, 'YYYY-MM'),
    'views', coalesce(m.cnt, 0),
    'label', case
      when extract(month from series.month) = 1 then 'فروردین'
      when extract(month from series.month) = 2 then 'اردیبهشت'
      when extract(month from series.month) = 3 then 'خرداد'
      when extract(month from series.month) = 4 then 'تیر'
      when extract(month from series.month) = 5 then 'مرداد'
      when extract(month from series.month) = 6 then 'شهریور'
      when extract(month from series.month) = 7 then 'مهر'
      when extract(month from series.month) = 8 then 'آبان'
      when extract(month from series.month) = 9 then 'آذر'
      when extract(month from series.month) = 10 then 'دی'
      when extract(month from series.month) = 11 then 'بهمن'
      when extract(month from series.month) = 12 then 'اسفند'
    end
  ) order by series.month)
  into v_popularity_trend
  from generate_series(
    date_trunc('month', now() - interval '11 months'),
    date_trunc('month', now()),
    interval '1 month'
  ) series(month)
  left join lateral (
    select count(*)::bigint as cnt
    from public.product_views pv
    join public.products p on p.id = pv.product_id
    where p.store_id = p_store_id
      and pv.created_at >= series.month
      and pv.created_at < series.month + interval '1 month'
  ) m on true;

  v_result := jsonb_build_object(
    'products_count', v_products_count,
    'total_views', v_total_views,
    'total_clicks', v_total_clicks,
    'total_saves', v_total_saves,
    'total_ai_recommendations', v_total_ai,
    'ctr', v_total_ctr,
    'monthly_growth', v_monthly_growth,
    'this_month_views', v_this_month,
    'last_month_views', v_last_month,
    'popularity_trend', coalesce(v_popularity_trend, '[]'::jsonb)
  );

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- 3. FUNCTION: get_store_analytics_ai_insights
-- Returns AI-related insights: top styles, colors, budgets, room types
-- from the user profiles and AI design pipeline data associated with
-- products from this store.
-- ------------------------------------------------------------
create or replace function public.get_store_analytics_ai_insights(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_top_styles jsonb;
  v_top_colors jsonb;
  v_top_budgets jsonb;
  v_top_room_types jsonb;
begin
  if not exists (
    select 1 from public.stores
    where id = p_store_id and (owner_id = auth.uid() or public.is_admin(auth.uid()))
  ) then
    raise exception 'not_authorized';
  end if;

  -- Top styles from profiles of users who viewed/interacted with this store's products
  select jsonb_agg(sub) into v_top_styles
  from (
    select prof.preferred_style as value, count(*)::bigint as count
    from public.product_views pv
    join public.products p on p.id = pv.product_id
    join public.profiles prof on prof.id = pv.viewer_id
    where p.store_id = p_store_id and prof.preferred_style is not null
    group by prof.preferred_style
    order by count(*) desc
    limit 5
  ) sub;

  -- Top colors from profiles (favorite_colors array)
  select jsonb_agg(sub) into v_top_colors
  from (
    select unnest(prof.favorite_colors) as value, count(*)::bigint as count
    from public.product_views pv
    join public.products p on p.id = pv.product_id
    join public.profiles prof on prof.id = pv.viewer_id
    where p.store_id = p_store_id and array_length(prof.favorite_colors, 1) > 0
    group by value
    order by count(*) desc
    limit 5
  ) sub;

  -- Top budget ranges
  select jsonb_agg(sub) into v_top_budgets
  from (
    select
      case
        when prof.preferred_budget < 5000000 then 'زیر ۵ میلیون'
        when prof.preferred_budget < 10000000 then '۵-۱۰ میلیون'
        when prof.preferred_budget < 25000000 then '۱۰-۲۵ میلیون'
        when prof.preferred_budget < 50000000 then '۲۵-۵۰ میلیون'
        else 'بالای ۵۰ میلیون'
      end as value,
      count(*)::bigint as count
    from public.product_views pv
    join public.products p on p.id = pv.product_id
    join public.profiles prof on prof.id = pv.viewer_id
    where p.store_id = p_store_id and prof.preferred_budget is not null
    group by value
    order by count(*) desc
    limit 5
  ) sub;

  -- Top room types from rooms designed with this store's products
  select jsonb_agg(sub) into v_top_room_types
  from (
    select 'اتاق_' || p.id as value, count(*)::bigint as count
    from public.placements pl
    join public.products p on p.id = pl.product_id
    join public.designs d on d.id = pl.design_id
    join public.rooms r on r.id = d.room_id
    where p.store_id = p_store_id
    group by p.id
    order by count(*) desc
    limit 5
  ) sub;

  return jsonb_build_object(
    'top_styles', coalesce(v_top_styles, '[]'::jsonb),
    'top_colors', coalesce(v_top_colors, '[]'::jsonb),
    'top_budgets', coalesce(v_top_budgets, '[]'::jsonb),
    'top_room_types', coalesce(v_top_room_types, '[]'::jsonb)
  );
end;
$$;