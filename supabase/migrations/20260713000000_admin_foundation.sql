-- Phase 11: Admin Foundation - backend RPCs, indexes, and infrastructure

-- Admin: get all subscriptions with plan and store info
create or replace function public.admin_get_subscriptions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return jsonb_agg(
    jsonb_build_object(
      'id', ss.id,
      'store_id', ss.store_id,
      'store_name', s.name,
      'owner_id', s.owner_id,
      'plan_id', ss.plan_id,
      'plan_name', sp.name,
      'plan_slug', sp.slug,
      'status', ss.status,
      'price_monthly', sp.price_monthly,
      'current_period_end', ss.current_period_end,
      'trial_ends_at', ss.trial_ends_at,
      'created_at', ss.created_at
    )
    order by ss.created_at desc
  )
  from public.store_subscriptions ss
  join public.stores s on s.id = ss.store_id
  left join public.subscription_plans sp on sp.id = ss.plan_id;
end;
$$;

-- Admin: get AI logs with user and store info
create or replace function public.admin_get_ai_logs(
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.ai_logs),
    'logs', (select jsonb_agg(sub) from (
      select
        al.id, al.user_id, p.full_name, al.room_id, al.model,
        al.created_at, al.prompt
      from public.ai_logs al
      left join public.profiles p on p.id = al.user_id
      order by al.created_at desc
      limit p_limit offset p_offset
    ) sub)
  );
end;
$$;

-- Admin: system health overview
create or replace function public.admin_get_system_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_db_size text;
  v_active_sessions int;
  v_recent_errors int;
  v_pending_reports int;
  v_pending_listings int;
  v_stores_no_products int;
  v_inactive_stores int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select count(*) into v_active_sessions
  from pg_stat_activity where state = 'active';

  select count(*) into v_pending_reports
  from public.reports where status = 'pending';

  select count(*) into v_pending_listings
  from public.second_hand_listings where approval_status = 'pending';

  select count(*) into v_stores_no_products
  from public.stores s
  where not exists (select 1 from public.products p where p.store_id = s.id and p.is_active = true);

  select count(*) into v_inactive_stores
  from public.stores s
  where not exists (
    select 1 from public.product_views pv
    join public.products p on p.id = pv.product_id
    where p.store_id = s.id and pv.created_at >= now() - interval '30 days'
  );

  return jsonb_build_object(
    'database_size', v_db_size,
    'active_sessions', v_active_sessions,
    'pending_reports', v_pending_reports,
    'pending_listings', v_pending_listings,
    'stores_no_products', v_stores_no_products,
    'inactive_stores', v_inactive_stores,
    'total_tables', (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'),
    'total_rpcs', (select count(*) from pg_proc where pronamespace = 'public'::regnamespace)
  );
end;
$$;

-- Admin: get stores with full details
create or replace function public.admin_get_stores_detailed()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'owner_id', s.owner_id,
      'owner_name', p.full_name,
      'city', s.city,
      'rating', s.rating,
      'product_count', (select count(*) from public.products where store_id = s.id),
      'active_product_count', (select count(*) from public.products where store_id = s.id and is_active = true),
      'subscription_status', ss.status,
      'plan_name', sp.name,
      'trust_score', ts.overall_score,
      'trust_badges', ts.badges,
      'health_score', hc.overall_score,
      'created_at', s.created_at
    )
    order by s.created_at desc
  )
  from public.stores s
  left join public.profiles p on p.id = s.owner_id
  left join public.store_subscriptions ss on ss.store_id = s.id
  left join public.subscription_plans sp on sp.id = ss.plan_id
  left join public.store_trust_scores ts on ts.store_id = s.id
  left join lateral (
    select overall_score from public.store_health_checks
    where store_id = s.id
    order by checked_at desc limit 1
  ) hc on true;
end;
$$;

-- Admin: get advertisements summary
create or replace function public.admin_get_advertisements()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return jsonb_build_object(
    'total_ads', (select count(*) from public.advertisements),
    'active_ads', (select count(*) from public.advertisements where is_active = true),
    'total_views', (select coalesce(sum(view_count), 0) from public.advertisements),
    'total_clicks', (select coalesce(sum(click_count), 0) from public.advertisements),
    'by_placement', (select jsonb_object_agg(placement, cnt) from (
      select placement, count(*) as cnt from public.advertisements group by placement
    ) t)
  );
end;
$$;

-- Admin: get reports summary
create or replace function public.admin_get_reports_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.reports),
    'pending', (select count(*) from public.reports where status = 'pending'),
    'resolved', (select count(*) from public.reports where status = 'resolved'),
    'dismissed', (select count(*) from public.reports where status = 'dismissed'),
    'by_type', (select jsonb_object_agg(target_type, cnt) from (
      select target_type, count(*) as cnt from public.reports group by target_type
    ) t)
  );
end;
$$;

-- Missing indexes for admin query performance
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_target_type on public.reports(target_type);
create index if not exists idx_second_hand_listings_approval on public.second_hand_listings(approval_status);
create index if not exists idx_advertisements_active on public.advertisements(is_active, placement);
create index if not exists idx_advertisements_placement on public.advertisements(placement);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_store_subscriptions_status on public.store_subscriptions(status);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_blocked on public.profiles(is_blocked) where is_blocked = true;
create index if not exists idx_reports_created_at on public.reports(created_at);
create index if not exists idx_ai_logs_created_at on public.ai_logs(created_at);
create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);
