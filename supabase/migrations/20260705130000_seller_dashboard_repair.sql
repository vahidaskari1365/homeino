-- ============================================================
-- Homeino — Seller Dashboard Repair
-- ============================================================
-- Aligns the backend with the LIVE schema so the seller dashboard has zero
-- broken queries. The seller/brand entity is `stores` (owner_id -> profiles.id).
--
-- STRICT COMPLIANCE:
--   - Does NOT touch ai_logs, rooms, designs, placements, or the Gemini +
--     Overlay AI pipeline.
--   - Additive only: new columns, RLS policies, indexes, one RPC and one view.
-- ============================================================

-- ------------------------------------------------------------
-- 1. stores = the seller/brand profile entity (contact + publish)
-- ------------------------------------------------------------
alter table public.stores
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists contact_published boolean not null default false,
  add column if not exists contact_published_at timestamptz;

-- ------------------------------------------------------------
-- 2. order_items RLS — sellers read items of their orders, customers their own
-- ------------------------------------------------------------
drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.profile_id = auth.uid() or o.customer_id = auth.uid())
    )
  );

drop policy if exists "order_items_customer_insert" on public.order_items;
create policy "order_items_customer_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. price_quotes RLS — customer + seller visibility, seller can respond
-- ------------------------------------------------------------
drop policy if exists "price_quotes_customer_select" on public.price_quotes;
create policy "price_quotes_customer_select" on public.price_quotes
  for select using (auth.uid() = customer_id);

drop policy if exists "price_quotes_seller_select" on public.price_quotes;
create policy "price_quotes_seller_select" on public.price_quotes
  for select using (auth.uid() = profile_id);

drop policy if exists "price_quotes_customer_insert" on public.price_quotes;
create policy "price_quotes_customer_insert" on public.price_quotes
  for insert with check (auth.uid() = customer_id);

drop policy if exists "price_quotes_seller_update" on public.price_quotes;
create policy "price_quotes_seller_update" on public.price_quotes
  for update using (auth.uid() = profile_id);

-- ------------------------------------------------------------
-- 4. Performance indexes (avoid seq scans on dashboard filters)
-- ------------------------------------------------------------
create index if not exists idx_orders_profile_id       on public.orders(profile_id);
create index if not exists idx_orders_customer_id       on public.orders(customer_id);
create index if not exists idx_order_items_order_id      on public.order_items(order_id);
create index if not exists idx_price_quotes_profile_id   on public.price_quotes(profile_id);
create index if not exists idx_price_quotes_customer_id  on public.price_quotes(customer_id);
create index if not exists idx_products_store_id         on public.products(store_id);
create index if not exists idx_product_views_product_id  on public.product_views(product_id);
create index if not exists idx_product_views_created_at  on public.product_views(created_at);
create index if not exists idx_stores_owner_id           on public.stores(owner_id);

-- ------------------------------------------------------------
-- 5. Daily product views for a store (SECURITY DEFINER, owner-scoped)
--    product_views has RLS locked; this RPC gives owners safe aggregate access.
-- ------------------------------------------------------------
create or replace function public.get_store_daily_views(p_store_id uuid, p_days integer default 30)
returns table(day date, views bigint)
language plpgsql
stable
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
    select (pv.created_at)::date as day, count(*)::bigint as views
    from public.product_views pv
    join public.products p on p.id = pv.product_id
    where p.store_id = p_store_id
      and pv.created_at >= (now() - make_interval(days => p_days))
    group by 1
    order by 1;
end;
$$;
grant execute on function public.get_store_daily_views(uuid, integer) to authenticated;

-- ------------------------------------------------------------
-- 6. Store health / overview — one efficient view instead of N client queries
--    security_invoker keeps per-user RLS (stores & products are public-select).
-- ------------------------------------------------------------
create or replace view public.seller_store_overview
with (security_invoker = on) as
select
  s.id                                                        as store_id,
  s.owner_id,
  s.name,
  s.rating,
  count(p.id)                                                 as product_count,
  count(p.id) filter (where p.is_active)                      as active_product_count,
  count(p.id) filter (
    where p.is_featured and (p.featured_until is null or p.featured_until > now())
  )                                                           as featured_count,
  count(p.id) filter (where coalesce(p.stock, 0) = 0)         as out_of_stock_count,
  coalesce(sum(coalesce(p.stock, 0)), 0)                      as total_stock
from public.stores s
left join public.products p on p.store_id = s.id
group by s.id;

grant select on public.seller_store_overview to authenticated, anon;
