-- Homeino — Phase 3: Subscription Engine
-- ============================================================
-- Full SaaS subscription architecture for store owners.
-- Each plan includes AI limits, product limits, featured
-- products, analytics access, storage limits, advertisement
-- limits — ready for future payment gateway.
--
-- STRICT COMPLIANCE:
--   - Does NOT implement payment processing
--   - Does NOT touch AI/Gemini pipeline tables
--   - Architecture only: ready for future payment gateway
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENRICH subscription_plans with full limit columns
-- ------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists ai_designs_per_month integer not null default 0,
  add column if not exists storage_mb integer not null default 0,
  add column if not exists max_ads integer not null default 0,
  add column if not exists analytics_tier text not null default 'none'
    check (analytics_tier in ('none', 'basic', 'pro', 'enterprise'));

comment on column public.subscription_plans.ai_designs_per_month is 'Number of AI design generations included per month';
comment on column public.subscription_plans.storage_mb is 'Storage quota in megabytes for product images and files';
comment on column public.subscription_plans.max_ads is 'Maximum number of active advertisements allowed';
comment on column public.subscription_plans.analytics_tier is 'Analytics access level: none, basic, pro, enterprise';

-- ------------------------------------------------------------
-- 2. UPSERT the four core plans with full limits
-- ------------------------------------------------------------
insert into public.subscription_plans (name, slug, tagline, price_monthly, price_yearly, max_products, max_featured, max_ads, ai_designs_per_month, storage_mb, analytics_tier, features, sort_order, is_active)
values
  ('Starter',       'starter',       'برای شروع فروش آنلاین',            0,      0,        15,  0,  3,  5,  50,  'basic',
    '["ثبت تا ۱۵ محصول", "۳ آگهی فعال", "۵ طراحی هوشمند در ماه", "۵۰ مگابایت فضای ذخیره‌سازی", "آنالیتیکس پایه", "پشتیبانی ایمیلی"]',
    1, true),
  ('Business',      'business',      'برای کسب‌وکارهای رو به رشد',       990000,  9900000, 100, 2,  10, 20, 200, 'basic',
    '["ثبت تا ۱۰۰ محصول", "۱۰ آگهی فعال", "۲۰ طراحی هوشمند در ماه", "۲۰۰ مگابایت فضای ذخیره‌سازی", "۲ محصول ویژه", "آنالیتیکس پایه", "پشتیبانی اولویت‌دار"]',
    2, true),
  ('Professional',  'professional',  'برای فروشگاه‌های حرفه‌ای',         2490000, 24900000, 500, 8,  30, 50, 500, 'pro',
    '["ثبت تا ۵۰۰ محصول", "۳۰ آگهی فعال", "۵۰ طراحی هوشمند در ماه", "۵۰۰ مگابایت فضای ذخیره‌سازی", "۸ محصول ویژه", "آنالیتیکس کامل هوش مصنوعی", "رتبه‌بندی بالاتر در جستجو"]',
    3, true),
  ('Enterprise',    'enterprise',    'برای زنجیره‌های فروشگاهی',         5990000, 59900000, null, 30, null, null, 2000, 'enterprise',
    '["محصولات نامحدود", "آگهی نامحدود", "طراحی هوشمند نامحدود", "۲ گیگابایت فضای ذخیره‌سازی", "۳۰ محصول ویژه", "آنالیتیکس کامل + گزارش سفارشی", "مدیر حساب اختصاصی"]',
    4, true)
on conflict (slug) do update set
  name             = excluded.name,
  tagline          = excluded.tagline,
  price_monthly    = excluded.price_monthly,
  price_yearly     = excluded.price_yearly,
  max_products     = excluded.max_products,
  max_featured     = excluded.max_featured,
  max_ads          = excluded.max_ads,
  ai_designs_per_month = excluded.ai_designs_per_month,
  storage_mb       = excluded.storage_mb,
  analytics_tier   = excluded.analytics_tier,
  features         = excluded.features,
  sort_order       = excluded.sort_order,
  is_active        = excluded.is_active;

-- ------------------------------------------------------------
-- 3. ADD missing columns to store_subscriptions
-- ------------------------------------------------------------
alter table public.store_subscriptions
  add column if not exists ai_designs_used_this_month integer not null default 0,
  add column if not exists storage_used_mb integer not null default 0,
  add column if not exists ads_used integer not null default 0,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists billing_anchor_day integer check (billing_anchor_day between 1 and 28);

comment on column public.store_subscriptions.ai_designs_used_this_month is 'Counter of AI designs used in the current billing period';
comment on column public.store_subscriptions.storage_used_mb is 'Current storage usage in megabytes';
comment on column public.store_subscriptions.ads_used is 'Current number of active advertisements';
comment on column public.store_subscriptions.trial_ends_at is 'When the free trial period ends';
comment on column public.store_subscriptions.canceled_at is 'When the subscription was canceled';
comment on column public.store_subscriptions.billing_anchor_day is 'Day of month for billing (future payment gateway use)';

-- ------------------------------------------------------------
-- 4. FUNCTION: Get the current plan limits for a store
-- ------------------------------------------------------------
create or replace function public.get_store_limits(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id       uuid;
  v_status        text;
  v_ai_used       int;
  v_storage_used  int;
  v_ads_used      int;
  v_result        jsonb;
begin
  select
    ss.plan_id,
    ss.status,
    coalesce(ss.ai_designs_used_this_month, 0),
    coalesce(ss.storage_used_mb, 0),
    coalesce(ss.ads_used, 0)
  into v_plan_id, v_status, v_ai_used, v_storage_used, v_ads_used
  from public.store_subscriptions ss
  where ss.store_id = p_store_id;

  if not found then
    return jsonb_build_object('error', 'store_not_found');
  end if;

  select jsonb_build_object(
    'status', v_status,
    'plan', row_to_json(sp.*),
    'usage', jsonb_build_object(
      'ai_designs_used', v_ai_used,
      'storage_used_mb', v_storage_used,
      'ads_used', v_ads_used
    )
  ) into v_result
  from public.subscription_plans sp
  where sp.id = v_plan_id;

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- 5. FUNCTION: Check if a store can perform an action
-- Returns true/false with a message
-- ------------------------------------------------------------
create or replace function public.check_store_limit(
  p_store_id  uuid,
  p_limit_type text,  -- 'ai_design', 'product', 'ad', 'featured', 'storage'
  p_quantity  int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan      record;
  v_used      int;
  v_max       int;
  v_available int;
begin
  -- Get plan + current usage
  select
    sp.*,
    coalesce(ss.ai_designs_used_this_month, 0) as ai_used,
    coalesce(ss.storage_used_mb, 0) as storage_used,
    coalesce(ss.ads_used, 0) as ads_used
  into v_plan
  from public.store_subscriptions ss
  join public.subscription_plans sp on sp.id = ss.plan_id
  where ss.store_id = p_store_id;

  if not found then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'اشتراکی برای این فروشگاه یافت نشد',
      'code', 'no_subscription'
    );
  end if;

  -- Determine limit
  case p_limit_type
    when 'ai_design' then
      v_max := v_plan.ai_designs_per_month;
      v_used := v_plan.ai_used;
      if v_max is null then
        return jsonb_build_object('allowed', true, 'reason', 'unlimited', 'code', 'ok');
      end if;
      v_available := v_max - v_used;
      if v_available < p_quantity then
        return jsonb_build_object(
          'allowed', false,
          'reason', format('محدودیت طراحی هوشمند: از %s طراحی در ماه استفاده کرده‌اید', v_max),
          'code', 'ai_design_limit_exceeded',
          'max', v_max, 'used', v_used, 'available', v_available
        );
      end if;

    when 'product' then
      v_max := v_plan.max_products;
      if v_max is null then
        return jsonb_build_object('allowed', true, 'reason', 'unlimited', 'code', 'ok');
      end if;
      select count(*) into v_used from public.products
        where store_id = p_store_id and is_active = true;
      v_available := v_max - v_used;
      if v_available < p_quantity then
        return jsonb_build_object(
          'allowed', false,
          'reason', format('محدودیت محصولات: حداکثر %s محصول مجاز است', v_max),
          'code', 'product_limit_exceeded',
          'max', v_max, 'used', v_used, 'available', v_available
        );
      end if;

    when 'featured' then
      v_max := v_plan.max_featured;
      if v_max is null then
        return jsonb_build_object('allowed', true, 'reason', 'unlimited', 'code', 'ok');
      end if;
      select count(*) into v_used from public.products
        where store_id = p_store_id and is_featured = true;
      v_available := v_max - v_used;
      if v_available < p_quantity then
        return jsonb_build_object(
          'allowed', false,
          'reason', format('محدودیت محصولات ویژه: حداکثر %s محصول ویژه مجاز است', v_max),
          'code', 'featured_limit_exceeded',
          'max', v_max, 'used', v_used, 'available', v_available
        );
      end if;

    when 'ad' then
      v_max := v_plan.max_ads;
      if v_max is null then
        return jsonb_build_object('allowed', true, 'reason', 'unlimited', 'code', 'ok');
      end if;
      v_available := v_max - v_plan.ads_used;
      if v_available < p_quantity then
        return jsonb_build_object(
          'allowed', false,
          'reason', format('محدودیت آگهی: حداکثر %s آگهی فعال مجاز است', v_max),
          'code', 'ad_limit_exceeded',
          'max', v_max, 'used', v_plan.ads_used, 'available', v_available
        );
      end if;

    when 'storage' then
      v_max := v_plan.storage_mb;
      if v_max is null then
        return jsonb_build_object('allowed', true, 'reason', 'unlimited', 'code', 'ok');
      end if;
      v_available := v_max - v_plan.storage_used;
      if v_available < p_quantity then
        return jsonb_build_object(
          'allowed', false,
          'reason', format('محدودیت فضای ذخیره‌سازی: %s مگابایت از %s مگابایت استفاده شده', v_plan.storage_used, v_max),
          'code', 'storage_limit_exceeded',
          'max', v_max, 'used', v_plan.storage_used, 'available', v_available
        );
      end if;

    else
      return jsonb_build_object('allowed', false, 'reason', 'نوع محدودیت نامعتبر است', 'code', 'invalid_limit_type');
  end case;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'code', 'ok',
    'available', v_available,
    'max', v_max,
    'used', v_used
  );
end;
$$;

-- ------------------------------------------------------------
-- 6. FUNCTION: Increment usage counter for a store
-- Called when an AI design is generated, a product is added, etc.
-- ------------------------------------------------------------
create or replace function public.increment_store_usage(
  p_store_id   uuid,
  p_usage_type text,  -- 'ai_design', 'storage_mb', 'ad'
  p_amount     int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  case p_usage_type
    when 'ai_design' then
      update public.store_subscriptions
        set ai_designs_used_this_month = ai_designs_used_this_month + p_amount
        where store_id = p_store_id;
    when 'storage_mb' then
      update public.store_subscriptions
        set storage_used_mb = storage_used_mb + p_amount
        where store_id = p_store_id;
    when 'ad' then
      update public.store_subscriptions
        set ads_used = ads_used + p_amount
        where store_id = p_store_id;
    else
      return jsonb_build_object('error', 'invalid_usage_type');
  end case;

  if not found then
    return jsonb_build_object('error', 'store_not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- ------------------------------------------------------------
-- 7. FUNCTION: Reset monthly usage counters (for cron)
-- ------------------------------------------------------------
create or replace function public.reset_monthly_usage()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.store_subscriptions
    set ai_designs_used_this_month = 0
    where status = 'active' or status = 'trialing';
end;
$$;

-- ------------------------------------------------------------
-- 8. UPGRADE init_store_subscription to include trial_ends_at
-- ------------------------------------------------------------
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
  insert into public.store_subscriptions (store_id, plan_id, status, started_at, current_period_end, trial_ends_at, billing_anchor_day)
    values (NEW.id, v_starter_id, 'trialing', now(), now() + interval '14 days', now() + interval '14 days', extract(day from now())::int)
    on conflict (store_id) do nothing;
  return NEW;
end;
$$;

-- Create index for usage queries
create index if not exists idx_store_subscriptions_plan_id on public.store_subscriptions(plan_id);
create index if not exists idx_store_subscriptions_status on public.store_subscriptions(status);