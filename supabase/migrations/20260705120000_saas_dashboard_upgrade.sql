-- ============================================================
-- Homeino — Customer & Seller SaaS Dashboard Upgrade
-- ============================================================
-- Adds: profile enrichment (personal/contact/house profile), a dedicated
-- addresses table, the AI-design Token system, My Ads (+ categories,
-- including inactive reserved service categories), SaaS subscription
-- architecture (plans + store subscriptions), Featured Products flag,
-- and a generic analytics/event-tracking table.
--
-- STRICT COMPLIANCE:
--   - Does NOT touch ai_logs, rooms, designs, placements, or any part of
--     the Gemini + Overlay AI rendering pipeline.
--   - Does NOT create marketplace checkout or payment tables — token /
--     subscription balances are architecture-only, credited via
--     SECURITY DEFINER functions, ready for a future payment gateway.
--   - Addresses live in their own table, never inside `profiles`.
--   - Reserved service categories are inserted with is_active = false and
--     stay invisible to normal catalog queries (enforced by RLS below).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILE ENRICHMENT (personal info, contact, house profile, tokens)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists avatar_url text,
  add column if not exists secondary_phone text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists birth_date date,
  -- House profile (improves AI recommendations)
  add column if not exists property_type text check (property_type in ('apartment','villa','office','commercial')),
  add column if not exists area_sqm numeric,
  add column if not exists room_count integer,
  add column if not exists construction_year integer,
  add column if not exists preferred_style text,
  add column if not exists preferred_budget numeric,
  add column if not exists favorite_colors text[] not null default '{}',
  -- Token / free-quota system
  add column if not exists token_balance integer not null default 0,
  add column if not exists free_designs_used integer not null default 0,
  add column if not exists free_designs_limit integer not null default 3;

comment on column public.profiles.token_balance is 'Paid AI-design token balance. Credited only via public.credit_tokens() — never written to directly by clients.';
comment on column public.profiles.free_designs_used is 'Count of free AI designs already consumed (first free_designs_limit designs are free).';

-- ------------------------------------------------------------
-- 2. ADDRESSES (dedicated table — never stored on profiles)
-- ------------------------------------------------------------
create table if not exists public.addresses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  title            text,
  province         text,
  city             text,
  district         text,
  neighborhood     text,
  street           text,
  alley            text,
  building_number  text,
  unit             text,
  floor            text,
  postal_code      text,
  description      text,
  latitude         numeric,
  longitude        numeric,
  is_default       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_addresses_user_id on public.addresses(user_id);

create trigger update_addresses_updated_at
  before update on public.addresses
  for each row execute function public.update_updated_at_column();

-- Only one default address per user
create or replace function public.enforce_single_default_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_default then
    update public.addresses
      set is_default = false
      where user_id = NEW.user_id and id <> NEW.id and is_default = true;
  end if;
  return NEW;
end;
$$;

create trigger addresses_single_default
  before insert or update on public.addresses
  for each row execute function public.enforce_single_default_address();

alter table public.addresses enable row level security;

create policy "addresses_owner_select" on public.addresses
  for select using (auth.uid() = user_id);
create policy "addresses_owner_insert" on public.addresses
  for insert with check (auth.uid() = user_id);
create policy "addresses_owner_update" on public.addresses
  for update using (auth.uid() = user_id);
create policy "addresses_owner_delete" on public.addresses
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. TOKEN SYSTEM (AI design credits — architecture-ready for payments)
-- ------------------------------------------------------------
create table if not exists public.token_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  amount         integer not null, -- positive = credit, negative = debit
  reason         text not null check (reason in (
                    'free_design_used', 'ai_design_used', 'purchase',
                    'admin_adjustment', 'ad_posted_free', 'refund'
                 )),
  reference_type text,
  reference_id   uuid,
  balance_after  integer not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_token_transactions_user_id on public.token_transactions(user_id);

alter table public.token_transactions enable row level security;

create policy "token_transactions_owner_select" on public.token_transactions
  for select using (auth.uid() = user_id);
-- No direct insert/update/delete policy for regular users — the ledger is
-- only ever written by the SECURITY DEFINER functions below.

-- Atomically consumes one AI-design credit: free quota first, then tokens.
-- Raises 'insufficient_credit' if the user has neither. Called by the
-- frontend BEFORE invoking the (untouched) gemini-decorator Edge Function —
-- it never participates in the AI validation/sanitization/render pipeline.
create or replace function public.consume_design_credit(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
  v_limit int;
  v_balance int;
begin
  select free_designs_used, free_designs_limit, token_balance
    into v_used, v_limit, v_balance
    from public.profiles
    where id = p_user_id
    for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_used < v_limit then
    update public.profiles
      set free_designs_used = free_designs_used + 1
      where id = p_user_id;

    insert into public.token_transactions (user_id, amount, reason, balance_after)
      values (p_user_id, 0, 'free_design_used', v_balance);

    return jsonb_build_object(
      'source', 'free',
      'free_designs_remaining', v_limit - (v_used + 1),
      'token_balance', v_balance
    );
  end if;

  if v_balance > 0 then
    update public.profiles
      set token_balance = token_balance - 1
      where id = p_user_id;

    insert into public.token_transactions (user_id, amount, reason, balance_after)
      values (p_user_id, -1, 'ai_design_used', v_balance - 1);

    return jsonb_build_object(
      'source', 'token',
      'free_designs_remaining', 0,
      'token_balance', v_balance - 1
    );
  end if;

  raise exception 'insufficient_credit';
end;
$$;

-- Credits tokens to a user (future payment gateway webhook / admin top-up).
create or replace function public.credit_tokens(p_user_id uuid, p_amount int, p_reason text default 'purchase')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  update public.profiles
    set token_balance = token_balance + p_amount
    where id = p_user_id
    returning token_balance into v_new_balance;

  if not found then
    raise exception 'profile_not_found';
  end if;

  insert into public.token_transactions (user_id, amount, reason, balance_after)
    values (p_user_id, p_amount, coalesce(p_reason, 'purchase'), v_new_balance);

  return jsonb_build_object('token_balance', v_new_balance);
end;
$$;

-- ------------------------------------------------------------
-- 4. MY ADS (+ categories, incl. inactive reserved service categories)
-- ------------------------------------------------------------
create table if not exists public.ad_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  icon        text,
  parent_id   uuid references public.ad_categories(id) on delete set null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ad_categories_parent_id on public.ad_categories(parent_id);
create index if not exists idx_ad_categories_active on public.ad_categories(is_active);

alter table public.ad_categories enable row level security;

-- Visible categories are public; inactive/reserved ones are hidden from
-- normal users and only visible to admins (future admin dashboard).
create policy "ad_categories_public_select_active" on public.ad_categories
  for select using (is_active = true or public.is_admin(auth.uid()));
create policy "ad_categories_admin_write" on public.ad_categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.ad_categories (name, slug, icon, is_active, sort_order) values
  ('مبلمان', 'furniture', 'sofa', true, 1),
  ('روشنایی', 'lighting', 'lamp', true, 2),
  ('دکوراسیون', 'decoration', 'palette', true, 3),
  ('لوازم جانبی', 'accessories', 'package', true, 4),
  ('پرده', 'curtains', 'blinds', true, 5),
  ('فرش و موکت', 'carpets', 'layout-grid', true, 6),
  ('آشپزخانه', 'kitchen', 'chef-hat', true, 7),
  ('مبلمان اداری', 'office-furniture', 'briefcase', true, 8)
on conflict (slug) do nothing;

-- Reserved for future service marketplace — inactive until launched.
insert into public.ad_categories (name, slug, icon, is_active, sort_order) values
  ('طراحان داخلی', 'interior-designers', 'pencil-ruler', false, 100),
  ('نصاب پرده', 'curtain-installers', 'wrench', false, 101),
  ('نقاشی ساختمان', 'painters', 'paint-roller', false, 102),
  ('بازسازی', 'renovation', 'hammer', false, 103),
  ('اسباب‌کشی', 'moving-services', 'truck', false, 104),
  ('نظافت منزل', 'cleaning', 'sparkles', false, 105),
  ('برق‌کار', 'electricians', 'zap', false, 106),
  ('لوله‌کش', 'plumbers', 'wrench', false, 107),
  ('نجار', 'carpenters', 'axe', false, 108),
  ('تهویه مطبوع', 'hvac', 'fan', false, 109)
on conflict (slug) do nothing;

create table if not exists public.ads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  category_id  uuid references public.ad_categories(id) on delete set null,
  title        text not null,
  description  text,
  price        numeric,
  images       jsonb not null default '[]',
  city         text,
  status       text not null default 'draft' check (status in ('draft','active','paused','expired')),
  is_free      boolean not null default true,
  views_count  integer not null default 0,
  clicks_count integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz
);

create index if not exists idx_ads_user_id on public.ads(user_id);
create index if not exists idx_ads_category_id on public.ads(category_id);
create index if not exists idx_ads_status on public.ads(status);

create trigger update_ads_updated_at
  before update on public.ads
  for each row execute function public.update_updated_at_column();

-- First ad is free; every ad after that is flagged non-free (token cost
-- to be enforced once the payment gateway ships — NOT charged yet).
create or replace function public.set_ad_free_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count int;
begin
  select count(*) into v_existing_count
    from public.ads
    where user_id = NEW.user_id;

  NEW.is_free := (v_existing_count = 0);
  return NEW;
end;
$$;

create trigger ads_set_free_flag
  before insert on public.ads
  for each row execute function public.set_ad_free_flag();

alter table public.ads enable row level security;

create policy "ads_public_select_active" on public.ads
  for select using (status = 'active' or auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "ads_owner_insert" on public.ads
  for insert with check (auth.uid() = user_id);
create policy "ads_owner_update" on public.ads
  for update using (auth.uid() = user_id);
create policy "ads_owner_delete" on public.ads
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. SUBSCRIPTIONS (architecture only — no payment processing)
-- ------------------------------------------------------------
create table if not exists public.subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  tagline       text,
  price_monthly numeric not null default 0,
  price_yearly  numeric not null default 0,
  max_products  integer,
  max_featured  integer not null default 0,
  features      jsonb not null default '[]',
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;
create policy "subscription_plans_public_select" on public.subscription_plans
  for select using (is_active = true or public.is_admin(auth.uid()));
create policy "subscription_plans_admin_write" on public.subscription_plans
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.subscription_plans (name, slug, tagline, price_monthly, price_yearly, max_products, max_featured, features, sort_order) values
  ('Starter', 'starter', 'برای شروع فروش آنلاین', 0, 0, 15, 0,
    '["ثبت تا ۱۵ محصول", "نمایش در فروشگاه‌ها", "پشتیبانی ایمیلی"]', 1),
  ('Business', 'business', 'برای کسب‌وکارهای رو به رشد', 990000, 9900000, 100, 2,
    '["ثبت تا ۱۰۰ محصول", "۲ محصول ویژه", "آنالیتیکس پایه", "پشتیبانی اولویت‌دار"]', 2),
  ('Professional', 'professional', 'برای فروشگاه‌های حرفه‌ای', 2490000, 24900000, 500, 8,
    '["ثبت تا ۵۰۰ محصول", "۸ محصول ویژه", "آنالیتیکس کامل هوش مصنوعی", "رتبه‌بندی بالاتر در جستجو"]', 3),
  ('Enterprise', 'enterprise', 'برای زنجیره‌های فروشگاهی', 5990000, 59900000, null, 30,
    '["محصولات نامحدود", "۳۰ محصول ویژه", "مدیر حساب اختصاصی", "گزارش‌های سفارشی"]', 4)
on conflict (slug) do nothing;

create table if not exists public.store_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null unique references public.stores(id) on delete cascade,
  plan_id             uuid references public.subscription_plans(id),
  status              text not null default 'none' check (status in ('trialing','active','past_due','canceled','none')),
  started_at          timestamptz,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_store_subscriptions_store_id on public.store_subscriptions(store_id);

create trigger update_store_subscriptions_updated_at
  before update on public.store_subscriptions
  for each row execute function public.update_updated_at_column();

alter table public.store_subscriptions enable row level security;

create policy "store_subscriptions_owner_select" on public.store_subscriptions
  for select using (
    auth.uid() = (select owner_id from public.stores where id = store_id)
    or public.is_admin(auth.uid())
  );
create policy "store_subscriptions_admin_write" on public.store_subscriptions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Every new store starts on a 14-day Starter trial (architecture only, no
-- billing triggered — a real payment gateway will later update this row).
create or replace function public.init_store_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starter_id uuid;
begin
  select id into v_starter_id from public.subscription_plans where slug = 'starter' limit 1;

  insert into public.store_subscriptions (store_id, plan_id, status, started_at, current_period_end)
    values (NEW.id, v_starter_id, 'trialing', now(), now() + interval '14 days')
    on conflict (store_id) do nothing;

  return NEW;
end;
$$;

create trigger stores_init_subscription
  after insert on public.stores
  for each row execute function public.init_store_subscription();

-- ------------------------------------------------------------
-- 6. FEATURED PRODUCTS
-- ------------------------------------------------------------
alter table public.products
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz;

create index if not exists idx_products_is_featured on public.products(is_featured) where is_featured = true;

-- ------------------------------------------------------------
-- 7. ANALYTICS / EVENT TRACKING
-- ------------------------------------------------------------
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  session_id  text,
  event_type  text not null check (event_type in (
                'user_registered', 'profile_completed', 'room_uploaded',
                'ai_started', 'ai_finished', 'ai_failed',
                'design_saved', 'design_shared',
                'product_suggested', 'product_viewed', 'product_clicked',
                'favorite_added', 'ad_created', 'ad_edited', 'ad_deleted',
                'token_used', 'subscription_viewed', 'featured_product_viewed',
                'notifications_read'
              )),
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_analytics_events_user_id on public.analytics_events(user_id);
create index if not exists idx_analytics_events_type on public.analytics_events(event_type);
create index if not exists idx_analytics_events_entity on public.analytics_events(entity_type, entity_id);
create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);

alter table public.analytics_events enable row level security;

-- Anyone (incl. anonymous, via session_id) can log an event about
-- themselves; nobody can read someone else's raw event stream except admins.
create policy "analytics_events_self_insert" on public.analytics_events
  for insert with check (user_id is null or auth.uid() = user_id);
create policy "analytics_events_owner_select" on public.analytics_events
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Store-scoped analytics for the Seller Dashboard's AI Analytics section.
-- SECURITY DEFINER so a store owner can read aggregated stats about their
-- OWN products without needing broad access to analytics_events/placements.
create or replace function public.get_store_product_analytics(p_store_id uuid)
returns table (
  product_id uuid,
  product_name text,
  views bigint,
  clicks bigint,
  saves bigint,
  ai_recommendations bigint
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
      coalesce((select count(*) from public.product_views pv where pv.product_id = p.id), 0),
      coalesce((select count(*) from public.analytics_events ae
                  where ae.event_type = 'product_clicked' and ae.entity_type = 'product' and ae.entity_id = p.id), 0),
      coalesce((select count(*) from public.wishlists w
                  where w.item_type = 'product' and w.item_id = p.id::text), 0),
      coalesce((select count(*) from public.placements pl where pl.product_id = p.id), 0)
    from public.products p
    where p.store_id = p_store_id;
end;
$$;
