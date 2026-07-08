-- Homeino — Schema Synchronization
-- ============================================================
-- Creates ALL tables that the application code references but
-- are missing from the production database schema.
-- ============================================================

do $$ begin
-- ------------------------------------------------------------
-- 1. ADVERTISEMENTS
-- ------------------------------------------------------------
create table if not exists public.advertisements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  link_url    text,
  placement   text not null check (placement in ('home_banner', 'sidebar', 'search_results', 'product_page')),
  status      text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  start_date  timestamptz not null default now(),
  end_date    timestamptz,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.advertisements enable row level security;
drop policy if exists "advertisements_public_select" on public.advertisements;
create policy "advertisements_public_select" on public.advertisements for select using (status = 'active');
drop policy if exists "advertisements_admin_all" on public.advertisements;
create policy "advertisements_admin_all" on public.advertisements using (public.is_admin(auth.uid()));
create index if not exists idx_advertisements_placement on public.advertisements(placement) where (status = 'active');
create index if not exists idx_advertisements_dates on public.advertisements(start_date, end_date);
end $$;

do $$ begin
-- ------------------------------------------------------------
-- 2. AUDIT LOGS
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null,
  actor_type  text not null check (actor_type in ('user', 'seller', 'admin', 'system')),
  target_type text not null,
  target_id   uuid,
  action      text not null,
  old_values  jsonb not null default '{}',
  new_values  jsonb not null default '{}',
  ip_address  text,
  user_agent  text,
  session_id  text,
  request_id  text,
  created_at  timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs for select using (public.is_admin(auth.uid()));
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id, actor_type);
create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
end $$;

do $$ begin
-- ------------------------------------------------------------
-- 3. INQUIRIES
-- ------------------------------------------------------------
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  store_id    uuid references public.stores(id) on delete set null,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'replied', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.inquiries enable row level security;
drop policy if exists "inquiries_owner_all" on public.inquiries;
create policy "inquiries_owner_all" on public.inquiries for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
drop policy if exists "inquiries_store_select" on public.inquiries;
create policy "inquiries_store_select" on public.inquiries for select using (
  exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
);
create index if not exists idx_inquiries_customer on public.inquiries(customer_id);
create index if not exists idx_inquiries_product on public.inquiries(product_id);
create index if not exists idx_inquiries_store on public.inquiries(store_id);
create index if not exists idx_inquiries_status on public.inquiries(status);
end $$;

do $$ begin
-- ------------------------------------------------------------
-- 4. LISTING PROMOTIONS
-- ------------------------------------------------------------
create table if not exists public.listing_promotions (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  plan_id    uuid not null references public.subscription_plans(id) on delete cascade,
  start_date timestamptz not null default now(),
  end_date   timestamptz not null,
  status     text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listing_promotions enable row level security;
drop policy if exists "listing_promotions_owner_all" on public.listing_promotions;
create policy "listing_promotions_owner_all" on public.listing_promotions for all using (
  exists (select 1 from public.products p join public.stores s on s.id = p.store_id where p.id = listing_id and s.owner_id = auth.uid())
);
create index if not exists idx_listing_promotions_listing on public.listing_promotions(listing_id);
create index if not exists idx_listing_promotions_dates on public.listing_promotions(start_date, end_date);
end $$;

do $$ begin
-- ------------------------------------------------------------
-- 5. PAYMENTS
-- ------------------------------------------------------------
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid references public.orders(id) on delete set null,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  amount           bigint not null check (amount > 0),
  currency         text not null default 'IRR',
  status           text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  payment_method   text,
  transaction_id   text,
  gateway_response jsonb default '{}',
  metadata         jsonb default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "payments_owner_select" on public.payments;
create policy "payments_owner_select" on public.payments for select using (auth.uid() = user_id);
drop policy if exists "payments_owner_insert" on public.payments;
create policy "payments_owner_insert" on public.payments for insert with check (auth.uid() = user_id);
drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments using (public.is_admin(auth.uid()));
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_status on public.payments(status);
end $$;

do $$ begin
-- ------------------------------------------------------------
-- 6. PRODUCT DAILY VIEWS
-- ------------------------------------------------------------
create table if not exists public.product_daily_views (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  date       date not null,
  views      integer not null default 0,
  unique(product_id, date)
);
alter table public.product_daily_views enable row level security;
drop policy if exists "product_daily_views_admin_select" on public.product_daily_views;
create policy "product_daily_views_admin_select" on public.product_daily_views for select using (public.is_admin(auth.uid()));
drop policy if exists "product_daily_views_store_select" on public.product_daily_views;
create policy "product_daily_views_store_select" on public.product_daily_views for select using (
  exists (select 1 from public.products p join public.stores s on s.id = p.store_id where p.id = product_id and s.owner_id = auth.uid())
);
create index if not exists idx_product_daily_views_product on public.product_daily_views(product_id);
create index if not exists idx_product_daily_views_date on public.product_daily_views(date);
end $$;

do $$ begin
-- ------------------------------------------------------------
-- 7. REPORTS
-- ------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'store', 'user', 'review', 'design')),
  target_id   uuid not null,
  reason      text not null,
  description text,
  status      text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_owner_insert" on public.reports;
create policy "reports_owner_insert" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all" on public.reports using (public.is_admin(auth.uid()));
create index if not exists idx_reports_target on public.reports(target_type, target_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_reporter on public.reports(reporter_id);
end $$;
