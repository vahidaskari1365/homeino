-- ============================================================
-- Homeino — Complete Business Layer (Phases 1–11)
-- ============================================================
-- Adds missing tables, expands existing ones, and creates
-- functions/views for the full SaaS business layer.
-- Does NOT modify any AI pipeline, Gemini integration,
-- overlay rendering, or existing UI components.
-- ============================================================

-- ------------------------------------------------------------
-- PHASE 1: EXPAND EVENT TRACKING
-- ------------------------------------------------------------
-- Add store_id and ip_address to analytics_events
alter table public.analytics_events
  add column if not exists store_id uuid references public.stores(id) on delete set null,
  add column if not exists ip_address text,
  add column if not exists device text,
  add column if not exists platform text;

create index if not exists idx_analytics_events_store_id on public.analytics_events(store_id);

-- Drop old check constraint and recreate with ALL event types
alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events add constraint analytics_events_event_type_check
  check (event_type in (
    'user_registered', 'user_login', 'user_logout',
    'profile_updated', 'profile_completed',
    'room_uploaded',
    'ai_started', 'ai_finished', 'ai_failed',
    'design_saved', 'design_deleted',
    'project_created', 'project_updated', 'project_deleted',
    'product_suggested', 'product_viewed', 'product_clicked',
    'product_favorited', 'product_unfavorited',
    'advertisement_created', 'advertisement_updated', 'advertisement_deleted', 'advertisement_viewed',
    'notification_read',
    'premium_viewed', 'subscription_viewed',
    'token_consumed', 'token_added',
    'address_added', 'address_updated', 'address_deleted',
    'store_viewed', 'store_followed',
    'design_shared', 'featured_product_viewed', 'notifications_read'
  ));

-- ------------------------------------------------------------
-- PHASE 2: TOKEN LEDGER
-- ------------------------------------------------------------
-- Wallets table: one wallet per user
create table if not exists public.wallets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  balance         integer not null default 0,
  lifetime_earned integer not null default 0,
  lifetime_spent  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);

create trigger update_wallets_updated_at
  before update on public.wallets
  for each row execute function public.update_updated_at_column();

alter table public.wallets enable row level security;

create policy "wallets_owner_select" on public.wallets
  for select using (auth.uid() = user_id);
-- Only SECURITY DEFINER functions write to wallets

-- Token packages (purchasable)
create table if not exists public.token_packages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  tokens          integer not null check (tokens > 0),
  price           numeric not null check (price >= 0),
  bonus_tokens    integer not null default 0,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.token_packages enable row level security;

create policy "token_packages_public_select" on public.token_packages
  for select using (is_active = true or public.is_admin(auth.uid()));

insert into public.token_packages (name, slug, tokens, price, bonus_tokens, sort_order) values
  ('پایه', 'basic', 10, 99000, 0, 1),
  ('نقره‌ای', 'silver', 30, 249000, 5, 2),
  ('طلایی', 'golden', 70, 499000, 15, 3),
  ('الماسی', 'diamond', 200, 1199000, 50, 4)
on conflict (slug) do nothing;

-- Token usage logs (detailed per-design tracking)
create table if not exists public.token_usage_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  design_id       uuid references public.designs(id) on delete set null,
  transaction_id  uuid references public.token_transactions(id) on delete set null,
  token_type      text not null check (token_type in ('free', 'paid')),
  amount          integer not null default 1,
  created_at      timestamptz not null default now()
);

create index if not exists idx_token_usage_logs_user_id on public.token_usage_logs(user_id);
create index if not exists idx_token_usage_logs_design_id on public.token_usage_logs(design_id);

alter table public.token_usage_logs enable row level security;

create policy "token_usage_logs_owner_select" on public.token_usage_logs
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Initialize wallet for existing users on first query (function)
create or replace function public.ensure_wallet(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
begin
  insert into public.wallets (user_id, balance)
    values (p_user_id, coalesce((select token_balance from public.profiles where id = p_user_id), 0))
    on conflict (user_id) do nothing
    returning * into v_wallet;

  if not found then
    select * into v_wallet from public.wallets where user_id = p_user_id;
  end if;

  return v_wallet;
end;
$$;

-- ------------------------------------------------------------
-- PHASE 3: SUBSCRIPTION ENGINE ENHANCEMENT
-- ------------------------------------------------------------
-- Add missing limit columns to subscription_plans
alter table public.subscription_plans
  add column if not exists max_ai_designs integer,
  add column if not exists max_advertisements integer,
  add column if not exists storage_limit_mb integer,
  add column if not exists has_analytics boolean not null default false;

-- Update existing plans with limits
update public.subscription_plans set
  max_ai_designs = 3,
  max_advertisements = 1,
  storage_limit_mb = 50,
  has_analytics = false
where slug = 'starter';

update public.subscription_plans set
  max_ai_designs = 20,
  max_advertisements = 10,
  storage_limit_mb = 200,
  has_analytics = true
where slug = 'business';

update public.subscription_plans set
  max_ai_designs = 100,
  max_advertisements = 50,
  storage_limit_mb = 1000,
  has_analytics = true
where slug = 'professional';

update public.subscription_plans set
  max_ai_designs = null, -- unlimited
  max_advertisements = null, -- unlimited
  storage_limit_mb = 5000,
  has_analytics = true
where slug = 'enterprise';

-- Function to check if a store can perform an action based on their plan
create or replace function public.check_plan_limit(p_store_id uuid, p_limit_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_status text;
  v_max_products int;
  v_max_featured int;
  v_max_ai int;
  v_max_ads int;
  v_current_count int;
  v_result jsonb;
begin
  select ss.plan_id, ss.status into v_plan_id, v_status
    from public.store_subscriptions ss
    where ss.store_id = p_store_id;

  if v_status not in ('active', 'trialing') then
    return jsonb_build_object('allowed', false, 'reason', 'no_active_subscription');
  end if;

  select sp.max_products, sp.max_featured, sp.max_ai_designs, sp.max_advertisements
    into v_max_products, v_max_featured, v_max_ai, v_max_ads
    from public.subscription_plans sp
    where sp.id = v_plan_id;

  case p_limit_type
    when 'products' then
      select count(*) into v_current_count from public.products
        where store_id = p_store_id and is_active = true;
      v_result := jsonb_build_object(
        'allowed', v_max_products is null or v_current_count < v_max_products,
        'current', v_current_count,
        'limit', v_max_products,
        'reason', case when v_max_products is not null and v_current_count >= v_max_products then 'product_limit_reached' else null end
      );
    when 'featured' then
      select count(*) into v_current_count from public.products
        where store_id = p_store_id and is_featured = true;
      v_result := jsonb_build_object(
        'allowed', v_max_featured is null or v_current_count < v_max_featured,
        'current', v_current_count,
        'limit', v_max_featured
      );
    when 'ai_designs' then
      v_result := jsonb_build_object(
        'allowed', v_max_ai is null or v_max_ai > 0,
        'limit', v_max_ai
      );
    when 'advertisements' then
      select count(*) into v_current_count from public.ads
        where user_id = (select owner_id from public.stores where id = p_store_id)
        and status = 'active';
      v_result := jsonb_build_object(
        'allowed', v_max_ads is null or v_current_count < v_max_ads,
        'current', v_current_count,
        'limit', v_max_ads
      );
    else
      v_result := jsonb_build_object('allowed', false, 'reason', 'unknown_limit_type');
  end case;

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- PHASE 4: STORE ANALYTICS
-- ------------------------------------------------------------
create table if not exists public.store_daily_stats (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  date            date not null,
  views           integer not null default 0,
  unique_visitors integer not null default 0,
  clicks          integer not null default 0,
  favorites       integer not null default 0,
  ai_recommendations integer not null default 0,
  orders_count    integer not null default 0,
  revenue         numeric not null default 0,
  created_at      timestamptz not null default now(),
  unique(store_id, date)
);

create index if not exists idx_store_daily_stats_store_date on public.store_daily_stats(store_id, date);

alter table public.store_daily_stats enable row level security;

create policy "store_daily_stats_owner_select" on public.store_daily_stats
  for select using (
    auth.uid() = (select owner_id from public.stores where id = store_id)
    or public.is_admin(auth.uid())
  );

-- Product analytics materialized view
create materialized view if not exists public.product_analytics_mv as
select
  p.id as product_id,
  p.store_id,
  p.name as product_name,
  coalesce(pv.view_count, 0) as views,
  coalesce(ae.click_count, 0) as clicks,
  coalesce(w.saves, 0) as favorites,
  coalesce(pl.ai_recommendations, 0) as ai_recommendations,
  p.is_featured,
  p.created_at
from public.products p
left join (select product_id, count(*) as view_count from public.product_views group by product_id) pv on pv.product_id = p.id
left join (select entity_id, count(*) as click_count from public.analytics_events where event_type = 'product_clicked' and entity_type = 'product' group by entity_id) ae on ae.entity_id = p.id::text
left join (select item_id, count(*) as saves from public.wishlists where item_type = 'product' group by item_id) w on w.item_id = p.id::text
left join (select product_id, count(*) as ai_recommendations from public.placements group by product_id) pl on pl.product_id = p.id;

create unique index if not exists idx_product_analytics_mv_product_id on public.product_analytics_mv(product_id);

create or replace function public.refresh_product_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.product_analytics_mv;
  return null;
end;
$$;

-- Analytics helper: CTR per product
create or replace function public.get_store_analytics(p_store_id uuid)
returns table (
  product_id uuid,
  product_name text,
  views bigint,
  clicks bigint,
  favorites bigint,
  ai_recommendations bigint,
  ctr numeric,
  recommendation_rate numeric,
  monthly_growth numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.stores where id = p_store_id;
  if v_owner_id <> auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    pa.product_id,
    pa.product_name,
    pa.views,
    pa.clicks,
    pa.favorites,
    pa.ai_recommendations,
    case when pa.views > 0 then round((pa.clicks::numeric / pa.views::numeric) * 100, 2) else 0 end as ctr,
    case when pa.views > 0 then round((pa.ai_recommendations::numeric / pa.views::numeric) * 100, 2) else 0 end as recommendation_rate,
    coalesce(
      (select round(
        ((select count(*)::numeric from public.analytics_events ae
          where ae.entity_type = 'product' and ae.entity_id = pa.product_id::text
          and ae.created_at >= now() - interval '30 days')
        -
        (select count(*)::numeric from public.analytics_events ae
          where ae.entity_type = 'product' and ae.entity_id = pa.product_id::text
          and ae.created_at >= now() - interval '60 days'
          and ae.created_at < now() - interval '30 days'))
        /
        nullif((select count(*)::numeric from public.analytics_events ae
          where ae.entity_type = 'product' and ae.entity_id = pa.product_id::text
          and ae.created_at >= now() - interval '60 days'
          and ae.created_at < now() - interval '30 days'), 0)
        * 100, 2), 0)
    ) as monthly_growth
  from public.product_analytics_mv pa
  where pa.store_id = p_store_id
  order by pa.views desc;
end;
$$;

-- ------------------------------------------------------------
-- PHASE 5: STORE HEALTH SYSTEM
-- ------------------------------------------------------------
create table if not exists public.store_health_checks (
  id                    uuid primary key default gen_random_uuid(),
  store_id              uuid not null references public.stores(id) on delete cascade,
  overall_score         integer not null default 0 check (overall_score between 0 and 100),
  missing_dimensions    boolean not null default false,
  poor_quality_images   boolean not null default false,
  missing_material      boolean not null default false,
  missing_colors        boolean not null default false,
  low_ai_recommendation boolean not null default false,
  low_ctr               boolean not null default false,
  outdated_prices       boolean not null default false,
  products_no_category  boolean not null default false,
  suggestions           jsonb not null default '[]',
  checked_at            timestamptz not null default now()
);

create index if not exists idx_store_health_checks_store_id on public.store_health_checks(store_id);
create index if not exists idx_store_health_checks_checked_at on public.store_health_checks(checked_at);

alter table public.store_health_checks enable row level security;

create policy "store_health_checks_owner_select" on public.store_health_checks
  for select using (
    auth.uid() = (select owner_id from public.stores where id = store_id)
    or public.is_admin(auth.uid())
  );

-- Health check function
create or replace function public.run_store_health_check(p_store_id uuid)
returns public.store_health_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.store_health_checks;
  v_total_products int;
  v_no_dimensions int;
  v_no_image int;
  v_no_material int;
  v_no_colors int;
  v_no_category int;
  v_low_price int;
  v_avg_ctr numeric;
  v_avg_ai_rec numeric;
  v_score int := 100;
  v_suggestions jsonb := '[]'::jsonb;
begin
  -- Count products
  select count(*) into v_total_products from public.products where store_id = p_store_id and is_active = true;

  if v_total_products = 0 then
    insert into public.store_health_checks (store_id, overall_score, suggestions, checked_at)
      values (p_store_id, 0, jsonb_build_array('هنوز محصولی به فروشگاه اضافه نکرده‌اید'), now())
      returning * into v_result;
    return v_result;
  end if;

  -- Missing dimensions (width, height, depth)
  select count(*) into v_no_dimensions from public.products
    where store_id = p_store_id and is_active = true
    and (width is null or height is null or depth is null);

  if v_no_dimensions > 0 then
    v_score := v_score - 15;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'dimensions',
      'severity', 'high',
      'message', format('%s محصول فاقد ابعاد (طول، عرض، ارتفاع) هستند', v_no_dimensions),
      'action', 'ابعاد محصولات را تکمیل کنید'
    );
  end if;

  -- Poor/no quality images
  select count(*) into v_no_image from public.products
    where store_id = p_store_id and is_active = true
    and (image_url is null or image_url = '');

  if v_no_image > 0 then
    v_score := v_score - 20;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'images',
      'severity', 'critical',
      'message', format('%s محصول بدون تصویر هستند', v_no_image),
      'action', 'برای همه محصولات تصویر با کیفیت آپلود کنید'
    );
  end if;

  -- Missing material info
  select count(*) into v_no_material from public.products
    where store_id = p_store_id and is_active = true
    and (attributes->>'material' is null or attributes->>'material' = '');

  if v_no_material > 0 then
    v_score := v_score - 10;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'material',
      'severity', 'medium',
      'message', 'برخی محصولات فاقد جنس هستند',
      'action', 'جنس محصولات را در ویژگی‌ها مشخص کنید'
    );
  end if;

  -- Missing colors
  select count(*) into v_no_colors from public.products
    where store_id = p_store_id and is_active = true
    and (attributes->>'color' is null and (tags is null or array_length(tags, 1) is null or not (array_length(tags, 1) > 0)));

  if v_no_colors > 0 then
    v_score := v_score - 10;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'colors',
      'severity', 'medium',
      'message', 'برخی محصولات فاقد رنگ‌بندی هستند',
      'action', 'رنگ‌ها را به محصولات اضافه کنید'
    );
  end if;

  -- Products without category
  select count(*) into v_no_category from public.products
    where store_id = p_store_id and is_active = true
    and category_id is null;

  if v_no_category > 0 then
    v_score := v_score - 10;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'category',
      'severity', 'high',
      'message', format('%s محصول بدون دسته‌بندی هستند', v_no_category),
      'action', 'محصولات را دسته‌بندی کنید'
    );
  end if;

  -- Outdated prices (price is 0 or null)
  select count(*) into v_low_price from public.products
    where store_id = p_store_id and is_active = true
    and (price is null or price <= 0);

  if v_low_price > 0 then
    v_score := v_score - 10;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'pricing',
      'severity', 'high',
      'message', format('%s محصول قیمت ندارند', v_low_price),
      'action', 'قیمت محصولات را به‌روز کنید'
    );
  end if;

  -- Low CTR (Click-Through Rate)
  select coalesce(avg(
    case when pv.views > 0 then (ae.clicks::numeric / pv.views::numeric) * 100 else 0 end
  ), 0) into v_avg_ctr
  from public.products p
  left join (select product_id, count(*) as views from public.product_views group by product_id) pv on pv.product_id = p.id
  left join (select entity_id::uuid, count(*) as clicks from public.analytics_events where event_type = 'product_clicked' and entity_type = 'product' group by entity_id) ae on ae.entity_id = p.id
  where p.store_id = p_store_id and p.is_active = true;

  if v_avg_ctr < 1.0 and v_total_products > 0 then
    v_score := v_score - 15;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'ctr',
      'severity', 'medium',
      'message', format('نرخ کلیک (CTR) پایین است: %s%%', round(v_avg_ctr, 2)),
      'action', 'تصاویر و توضیحات محصولات را بهبود دهید'
    );
  end if;

  -- Low AI recommendation rate
  select coalesce(avg(
    case when pv.views > 0 then (pl.recs::numeric / pv.views::numeric) * 100 else 0 end
  ), 0) into v_avg_ai_rec
  from public.products p
  left join (select product_id, count(*) as views from public.product_views group by product_id) pv on pv.product_id = p.id
  left join (select product_id, count(*) as recs from public.placements group by product_id) pl on pl.product_id = p.id
  where p.store_id = p_store_id and p.is_active = true;

  if v_avg_ai_rec < 0.5 and v_total_products > 0 then
    v_score := v_score - 10;
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'ai_recommendation',
      'severity', 'low',
      'message', format('نرخ توصیه هوش مصنوعی پایین است: %s%%', round(v_avg_ai_rec, 2)),
      'action', 'کیفیت داده‌های محصول را برای توصیه بهتر هوش مصنوعی بهبود دهید'
    );
  end if;

  -- Clamp score
  v_score := greatest(0, v_score);

  insert into public.store_health_checks (store_id, overall_score,
    missing_dimensions, poor_quality_images, missing_material, missing_colors,
    low_ai_recommendation, low_ctr, outdated_prices, products_no_category,
    suggestions, checked_at)
  values (p_store_id, v_score,
    v_no_dimensions > 0, v_no_image > 0, v_no_material > 0, v_no_colors > 0,
    v_avg_ai_rec < 0.5, v_avg_ctr < 1.0, v_low_price > 0, v_no_category > 0,
    v_suggestions, now())
  returning * into v_result;

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- PHASE 6: TRUST SCORE
-- ------------------------------------------------------------
create table if not exists public.store_trust_scores (
  id                      uuid primary key default gen_random_uuid(),
  store_id                uuid not null unique references public.stores(id) on delete cascade,
  overall_score           integer not null default 0 check (overall_score between 0 and 100),
  profile_completed       boolean not null default false,
  has_verified_info       boolean not null default false,
  product_quality_score   integer not null default 0 check (product_quality_score between 0 and 100),
  product_completeness    integer not null default 0 check (product_completeness between 0 and 100),
  has_active_subscription boolean not null default false,
  activity_score          integer not null default 0 check (activity_score between 0 and 100),
  ai_recommendation_score integer not null default 0 check (ai_recommendation_score between 0 and 100),
  store_age_days          integer not null default 0,
  badges                  text[] not null default '{}',
  calculated_at           timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_store_trust_scores_store_id on public.store_trust_scores(store_id);

create trigger update_store_trust_scores_updated_at
  before update on public.store_trust_scores
  for each row execute function public.update_updated_at_column();

alter table public.store_trust_scores enable row level security;

create policy "store_trust_scores_public_select" on public.store_trust_scores
  for select using (true);
create policy "store_trust_scores_owner_update" on public.store_trust_scores
  for update using (
    auth.uid() = (select owner_id from public.stores where id = store_id)
    or public.is_admin(auth.uid())
  );

-- Calculate trust score
create or replace function public.calculate_trust_score(p_store_id uuid)
returns public.store_trust_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.store_trust_scores;
  v_store public.stores;
  v_profile_completed boolean;
  v_has_verified boolean;
  v_product_quality int;
  v_product_completeness int;
  v_has_subscription boolean;
  v_activity_score int;
  v_ai_score int;
  v_age_days int;
  v_overall int;
  v_badges text[] := '{}'::text[];
  v_total_products int;
  v_products_with_images int;
  v_products_with_dimensions int;
  v_products_with_prices int;
  v_total_views int;
  v_ai_recommendations int;
begin
  select * into v_store from public.stores where id = p_store_id;

  -- Profile completion
  v_profile_completed :=
    v_store.name is not null and v_store.name != ''
    and v_store.contact_name is not null
    and v_store.phone is not null
    and v_store.city is not null
    and v_store.description is not null;

  -- Verified info (phone/contact published)
  v_has_verified := v_store.contact_published = true;

  -- Product quality (average rating)
  select
    count(*),
    count(*) filter (where image_url is not null and image_url != ''),
    count(*) filter (where width is not null and height is not null),
    count(*) filter (where price is not null and price > 0)
  into v_total_products, v_products_with_images, v_products_with_dimensions, v_products_with_prices
  from public.products where store_id = p_store_id and is_active = true;

  if v_total_products > 0 then
    v_product_quality := round(
      (v_products_with_images::numeric / v_total_products * 40) +
      (v_products_with_dimensions::numeric / v_total_products * 30) +
      (v_products_with_prices::numeric / v_total_products * 30)
    );
    v_product_completeness := round(
      (v_products_with_images::numeric / v_total_products * 100)
    );
  else
    v_product_quality := 0;
    v_product_completeness := 0;
  end if;

  -- Subscription active
  select exists(
    select 1 from public.store_subscriptions ss
    where ss.store_id = p_store_id and ss.status in ('active', 'trialing')
  ) into v_has_subscription;

  -- Activity score (based on recent 30 days views)
  select count(*) into v_total_views
  from public.product_views pv
  join public.products p on p.id = pv.product_id
  where p.store_id = p_store_id
  and pv.created_at >= now() - interval '30 days';

  v_activity_score := least(100, round(v_total_views::numeric / 10));

  -- AI recommendation score
  select count(*) into v_ai_recommendations
  from public.placements pl
  join public.products p on p.id = pl.product_id
  where p.store_id = p_store_id
  and pl.created_at >= now() - interval '30 days';

  v_ai_score := least(100, round(v_ai_recommendations::numeric / 5 * 100));

  -- Store age
  v_age_days := extract(day from now() - v_store.created_at);

  -- Calculate overall score
  v_overall := 0;
  if v_profile_completed then v_overall := v_overall + 20; end if;
  if v_has_verified then v_overall := v_overall + 15; end if;
  v_overall := v_overall + round(v_product_quality * 0.25);
  if v_has_subscription then v_overall := v_overall + 15; end if;
  v_overall := v_overall + round(v_activity_score * 0.15);
  v_overall := v_overall + round(v_ai_score * 0.1);
  v_overall := least(100, v_overall);

  -- Badges
  if v_profile_completed then v_badges := v_badges || '{profile_completed}'; end if;
  if v_has_verified then v_badges := v_badges || '{verified}'; end if;
  if v_has_subscription then v_badges := v_badges || '{premium}'; end if;
  if v_ai_score >= 50 then v_badges := v_badges || '{ai_optimized}'; end if;
  if v_overall >= 80 then v_badges := v_badges || '{top_rated}'; end if;
  if v_activity_score >= 50 then v_badges := v_badges || '{trending}'; end if;

  -- Upsert
  insert into public.store_trust_scores (store_id, overall_score,
    profile_completed, has_verified_info, product_quality_score,
    product_completeness, has_active_subscription, activity_score,
    ai_recommendation_score, store_age_days, badges, calculated_at)
  values (p_store_id, v_overall,
    v_profile_completed, v_has_verified, v_product_quality,
    v_product_completeness, v_has_subscription, v_activity_score,
    v_ai_score, v_age_days, v_badges, now())
  on conflict (store_id) do update set
    overall_score = excluded.overall_score,
    profile_completed = excluded.profile_completed,
    has_verified_info = excluded.has_verified_info,
    product_quality_score = excluded.product_quality_score,
    product_completeness = excluded.product_completeness,
    has_active_subscription = excluded.has_active_subscription,
    activity_score = excluded.activity_score,
    ai_recommendation_score = excluded.ai_recommendation_score,
    store_age_days = excluded.store_age_days,
    badges = excluded.badges,
    calculated_at = excluded.calculated_at
  returning * into v_result;

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- PHASE 7: BADGE ENGINE
-- ------------------------------------------------------------
create table if not exists public.badge_definitions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  category        text not null check (category in ('user', 'seller')),
  icon            text,
  criteria        jsonb not null default '{}',
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.badge_definitions enable row level security;
create policy "badge_definitions_public_select" on public.badge_definitions for select using (true);

insert into public.badge_definitions (name, slug, description, category, icon, sort_order) values
  ('اولین طراحی', 'first_design', 'اولین طراحی هوش مصنوعی خود را انجام دهید', 'user', 'pen-tool', 1),
  ('۱۰ طراحی', 'ten_designs', '۱۰ طراحی هوش مصنوعی انجام دهید', 'user', 'layers', 2),
  ('۵۰ طراحی', 'fifty_designs', '۵۰ طراحی هوش مصنوعی انجام دهید', 'user', 'award', 3),
  ('اولین علاقه‌مندی', 'first_favorite', 'یک محصول را به علاقه‌مندی‌ها اضافه کنید', 'user', 'heart', 4),
  ('اولین آگهی', 'first_advertisement', 'اولین آگهی خود را ایجاد کنید', 'user', 'megaphone', 5),
  ('تکمیل پروفایل', 'profile_completed', 'پروفایل خود را کامل کنید', 'user', 'check-circle', 6),
  ('فروشگاه تأیید شده', 'verified', 'فروشگاه تأیید شده', 'seller', 'shield-check', 7),
  ('فروشگاه ویژه', 'premium', 'اشتراک ویژه فروشگاهی', 'seller', 'crown', 8),
  ('بهینه‌سازی هوش مصنوعی', 'ai_optimized', 'محصولات با قابلیت توصیه هوش مصنوعی', 'seller', 'sparkles', 9),
  ('برترین فروشگاه', 'top_rated', 'بالاترین امتیاز اعتماد', 'seller', 'star', 10),
  ('فروشگاه محبوب', 'trending', 'فروشگاه با بیشترین بازدید', 'seller', 'trending-up', 11)
on conflict (slug) do nothing;

-- User badges
create table if not exists public.user_badges (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  badge_id        uuid not null references public.badge_definitions(id) on delete cascade,
  awarded_at      timestamptz not null default now(),
  unique(user_id, badge_id)
);

create index if not exists idx_user_badges_user_id on public.user_badges(user_id);

alter table public.user_badges enable row level security;
create policy "user_badges_owner_select" on public.user_badges
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "user_badges_self_select" on public.user_badges
  for select using (auth.uid() = user_id);

-- Seller badges
create table if not exists public.seller_badges (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  badge_id        uuid not null references public.badge_definitions(id) on delete cascade,
  awarded_at      timestamptz not null default now(),
  unique(store_id, badge_id)
);

create index if not exists idx_seller_badges_store_id on public.seller_badges(store_id);

alter table public.seller_badges enable row level security;
create policy "seller_badges_public_select" on public.seller_badges
  for select using (true);
create policy "seller_badges_owner_insert" on public.seller_badges
  for insert with check (
    auth.uid() = (select owner_id from public.stores where id = store_id)
    or public.is_admin(auth.uid())
  );

-- Auto-award function for user badges
create or replace function public.check_and_award_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_design_count int;
  v_favorite_count int;
  v_ad_count int;
  v_profile_complete boolean;
  v_profile record;
begin
  select * into v_profile from public.profiles where id = p_user_id;

  -- First design badge
  select count(*) into v_design_count from public.designs d
    join public.rooms r on r.id = d.room_id
    where r.user_id = p_user_id;

  if v_design_count >= 1 then
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from public.badge_definitions where slug = 'first_design'
    on conflict (user_id, badge_id) do nothing;
  end if;

  if v_design_count >= 10 then
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from public.badge_definitions where slug = 'ten_designs'
    on conflict (user_id, badge_id) do nothing;
  end if;

  if v_design_count >= 50 then
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from public.badge_definitions where slug = 'fifty_designs'
    on conflict (user_id, badge_id) do nothing;
  end if;

  -- First favorite
  select count(*) into v_favorite_count from public.wishlists where user_id = p_user_id;
  if v_favorite_count >= 1 then
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from public.badge_definitions where slug = 'first_favorite'
    on conflict (user_id, badge_id) do nothing;
  end if;

  -- First ad
  select count(*) into v_ad_count from public.ads where user_id = p_user_id;
  if v_ad_count >= 1 then
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from public.badge_definitions where slug = 'first_advertisement'
    on conflict (user_id, badge_id) do nothing;
  end if;

  -- Profile completed badge
  v_profile_complete := v_profile.first_name is not null
    and v_profile.last_name is not null
    and v_profile.phone is not null
    and v_profile.phone_verified = true;
  if v_profile_complete then
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from public.badge_definitions where slug = 'profile_completed'
    on conflict (user_id, badge_id) do nothing;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- PHASE 8: NOTIFICATION ENGINE
-- ------------------------------------------------------------
-- Notification preferences
create table if not exists public.notification_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  in_app          boolean not null default true,
  email           boolean not null default false,
  sms             boolean not null default false,
  push            boolean not null default false,
  order_updates   boolean not null default true,
  design_updates  boolean not null default true,
  marketing       boolean not null default false,
  system_alerts   boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id)
);

create trigger update_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.update_updated_at_column();

alter table public.notification_preferences enable row level security;
create policy "notification_preferences_owner_select" on public.notification_preferences
  for select using (auth.uid() = user_id);
create policy "notification_preferences_owner_insert" on public.notification_preferences
  for insert with check (auth.uid() = user_id);
create policy "notification_preferences_owner_update" on public.notification_preferences
  for update using (auth.uid() = user_id);

-- Notification logs (delivery tracking)
create table if not exists public.notification_logs (
  id                uuid primary key default gen_random_uuid(),
  notification_id   uuid references public.notifications(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  channel           text not null check (channel in ('in_app', 'email', 'sms', 'push')),
  status            text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'read')),
  error_message     text,
  delivered_at      timestamptz,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_notification_logs_user_id on public.notification_logs(user_id);
create index if not exists idx_notification_logs_notification_id on public.notification_logs(notification_id);

alter table public.notification_logs enable row level security;
create policy "notification_logs_owner_select" on public.notification_logs
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Add new notification types
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'order_new', 'order_status', 'review_new', 'quote_new',
    'consultation_new', 'consultation_message', 'site_visit_new',
    'inquiry_new', 'system',
    'design_complete', 'badge_awarded', 'token_low',
    'subscription_expiring', 'store_health_alert', 'welcome'
  ));

-- Enhanced create_notification function
create or replace function public.create_notification(
  _user_id uuid,
  _type text,
  _title text,
  _body text default null,
  _link text default null,
  _metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notif_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, link, metadata)
    values (_user_id, _type, _title, _body, _link, _metadata)
    returning id into v_notif_id;

  insert into public.notification_logs (notification_id, user_id, channel, status, delivered_at)
    values (v_notif_id, _user_id, 'in_app', 'delivered', now());

  return v_notif_id;
end;
$$;

-- Add store_id to notifications for store-scoped notifications
alter table public.notifications
  add column if not exists store_id uuid references public.stores(id) on delete cascade;

create index if not exists idx_notifications_store_id on public.notifications(store_id);

-- ------------------------------------------------------------
-- PHASE 9: PROFILE COMPLETION
-- ------------------------------------------------------------
create or replace function public.calculate_profile_completion(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_score int := 0;
  v_address_count int;
begin
  select * into v_profile from public.profiles where id = p_user_id;

  -- Photo / avatar (10%)
  if v_profile.avatar_url is not null then v_score := v_score + 10; end if;

  -- Personal info: first_name + last_name (15%)
  if v_profile.first_name is not null then v_score := v_score + 8; end if;
  if v_profile.last_name is not null then v_score := v_score + 7; end if;

  -- Phone (15%)
  if v_profile.phone is not null then v_score := v_score + 8; end if;
  if v_profile.phone_verified then v_score := v_score + 7; end if;

  -- Email (auto from auth, 10%)
  -- Assume email exists if user is authenticated
  v_score := v_score + 10;

  -- Address (15%)
  select count(*) into v_address_count from public.addresses where user_id = p_user_id;
  if v_address_count > 0 then v_score := v_score + 15; end if;

  -- House info: property_type + area_sqm + room_count (15%)
  if v_profile.property_type is not null then v_score := v_score + 5; end if;
  if v_profile.area_sqm is not null then v_score := v_score + 5; end if;
  if v_profile.room_count is not null then v_score := v_score + 5; end if;

  -- Preferences: style + budget + colors (10%)
  if v_profile.preferred_style is not null then v_score := v_score + 4; end if;
  if v_profile.preferred_budget is not null then v_score := v_score + 3; end if;
  if v_profile.favorite_colors is not null and array_length(v_profile.favorite_colors, 1) > 0 then v_score := v_score + 3; end if;

  -- Secondary phone (5%)
  if v_profile.secondary_phone is not null then v_score := v_score + 5; end if;

  return least(100, v_score);
end;
$$;

-- ------------------------------------------------------------
-- PHASE 11: ADMIN FOUNDATION
-- ------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references public.profiles(id) on delete cascade,
  action          text not null,
  entity_type     text,
  entity_id       uuid,
  details         jsonb not null default '{}',
  ip_address      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_admin_id on public.admin_audit_logs(admin_id);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at);

alter table public.admin_audit_logs enable row level security;
create policy "admin_audit_logs_admin_select" on public.admin_audit_logs
  for select using (public.is_admin(auth.uid()));
create policy "admin_audit_logs_admin_insert" on public.admin_audit_logs
  for insert with check (public.is_admin(auth.uid()));

-- Admin dashboard stats
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_stores', (select count(*) from public.stores),
    'total_products', (select count(*) from public.products where is_active = true),
    'total_orders', (select count(*) from public.orders),
    'total_designs', (select count(*) from public.designs),
    'total_revenue', (select coalesce(sum(total_amount), 0) from public.orders where status = 'delivered'),
    'active_subscriptions', (select count(*) from public.store_subscriptions where status in ('active', 'trialing')),
    'new_users_today', (select count(*) from public.profiles where created_at >= current_date),
    'new_stores_today', (select count(*) from public.stores where created_at >= current_date),
    'total_ai_designs', (select count(*) from public.designs),
    'total_events', (select count(*) from public.analytics_events)
  ) into v_result;

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------
create index if not exists idx_products_store_active on public.products(store_id, is_active);
create index if not exists idx_products_created_at on public.products(created_at);
create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_designs_room_id on public.designs(room_id);
create index if not exists idx_placements_design_product on public.placements(design_id, product_id);
create index if not exists idx_wishlists_user_type on public.wishlists(user_id, item_type);
create index if not exists idx_orders_profile on public.orders(profile_id, status);
create index if not exists idx_product_views_product on public.product_views(product_id, created_at);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
