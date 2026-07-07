-- 4. Enum: Add new notification types
do $$ begin
  alter type public.notification_type add value if not exists 'notifications_read';
exception when duplicate_object then null;
end $$;

-- 5. check_plan_limit function
create or replace function public.check_plan_limit(
  p_store_id  uuid,
  p_limit_type text,
  p_quantity  int default 1
) returns jsonb language plpgsql security definer as $$
declare
  v_plan record;
  v_usage int;
  v_max int;
begin
  select sp.* into v_plan
  from public.store_subscriptions ss
  join public.subscription_plans sp on sp.id = ss.plan_id
  where ss.store_id = p_store_id and ss.status = 'active';

  if v_plan.plan_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'بدون اشتراک فعال', 'code', 'no_subscription');
  end if;

  case p_limit_type
    when 'ai_design' then v_max := v_plan.max_ai_designs;
    when 'ad' then v_max := v_plan.max_advertisements;
    when 'storage' then v_max := v_plan.storage_limit_mb;
    else v_max := -1;
  end case;

  if v_max = -1 then
    return jsonb_build_object('allowed', true, 'max', v_max, 'used', 0, 'available', -1);
  end if;

  return jsonb_build_object('allowed', true, 'max', v_max, 'used', 0, 'available', v_max - p_quantity);
end;
$$;

-- 6. get_store_analytics function
drop function if exists public.get_store_analytics(uuid);
create or replace function public.get_store_analytics(p_store_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_views', coalesce(sum(s.views), 0),
    'total_clicks', coalesce(sum(s.clicks), 0),
    'total_favorites', coalesce(sum(s.favorites), 0),
    'total_recommendations', coalesce(sum(s.ai_recommendations), 0),
    'total_orders', coalesce(sum(s.orders_count), 0),
    'total_revenue', coalesce(sum(s.revenue), 0),
    'avg_daily_views', coalesce(round(avg(s.views)), 0)
  ) into v_result
  from public.store_daily_stats s
  where s.store_id = p_store_id and s.date >= now() - interval '30 days';

  return v_result;
end;
$$;

-- 7. calculate_profile_completion function
create or replace function public.calculate_profile_completion(p_user_id uuid)
returns int language plpgsql security definer as $$
declare
  v_profile record;
  v_total int := 0;
  v_filled int := 0;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then return 0; end if;

  if v_profile.first_name is not null and v_profile.first_name != '' then v_filled := v_filled + 1; end if;
  if v_profile.last_name is not null and v_profile.last_name != '' then v_filled := v_filled + 1; end if;
  if v_profile.phone is not null and v_profile.phone != '' then v_filled := v_filled + 1; end if;
  if v_profile.avatar_url is not null then v_filled := v_filled + 1; end if;
  if v_profile.property_type is not null then v_filled := v_filled + 1; end if;
  if v_profile.area_sqm is not null then v_filled := v_filled + 1; end if;
  if v_profile.room_count is not null then v_filled := v_filled + 1; end if;
  if v_profile.preferred_style is not null then v_filled := v_filled + 1; end if;
  if v_profile.preferred_budget is not null then v_filled := v_filled + 1; end if;

  v_total := 9;
  return round((v_filled::numeric / v_total) * 100);
end;
$$;

-- 8. get_admin_dashboard_stats function
create or replace function public.get_admin_dashboard_stats()
returns jsonb language plpgsql security definer as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_stores', (select count(*) from public.stores),
    'total_products', (select count(*) from public.products),
    'total_orders', (select count(*) from public.orders),
    'total_designs', (select count(*) from public.designs),
    'total_revenue', coalesce((select sum(total_amount) from public.orders where status = 'paid'), 0),
    'active_subscriptions', (select count(*) from public.store_subscriptions where status = 'active'),
    'new_users_today', (select count(*) from public.profiles where created_at >= current_date),
    'new_stores_today', (select count(*) from public.stores where created_at >= current_date),
    'total_ai_designs', (select count(*) from public.ai_logs),
    'total_events', (select count(*) from public.analytics_events)
  ) into v_result;
  return v_result;
end;
$$;

-- 9. Performance indexes
create index if not exists idx_notifications_store_id on public.notifications(store_id);
create index if not exists idx_products_store_active on public.products(store_id, is_active);
create index if not exists idx_products_created_at on public.products(created_at);
create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_designs_room_id on public.designs(room_id);
create index if not exists idx_placements_design_product on public.placements(design_id, product_id);
create index if not exists idx_wishlists_user_type on public.wishlists(user_id, item_type);
create index if not exists idx_orders_profile on public.orders(profile_id, status);
create index if not exists idx_product_views_product on public.product_views(product_id, created_at);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
