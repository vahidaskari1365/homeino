-- Phase 6 completion: Auto-award seller badges from trust score
-- Syncs store_trust_scores.badges[] -> seller_badges table
-- Adds triggers for automatic recalculation

create or replace function public.check_and_award_seller_badges(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trust public.store_trust_scores;
  v_badge_slugs text[];
  v_slug text;
  v_badge_id uuid;
begin
  select * into v_trust from public.store_trust_scores where store_id = p_store_id;
  if v_trust is null then
    v_trust := public.calculate_trust_score(p_store_id);
  end if;

  v_badge_slugs := v_trust.badges;

  foreach v_slug in array v_badge_slugs loop
    select id into v_badge_id from public.badge_definitions where slug = v_slug and is_active = true;
    if v_badge_id is not null then
      insert into public.seller_badges (store_id, badge_id)
      values (p_store_id, v_badge_id)
      on conflict (store_id, badge_id) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.auto_calculate_trust_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  if tg_table_name = 'stores' then
    v_store_id := new.id;
  elsif tg_table_name = 'products' then
    v_store_id := new.store_id;
  elsif tg_table_name = 'store_subscriptions' then
    v_store_id := new.store_id;
  else
    return new;
  end if;

  if v_store_id is not null then
    perform public.calculate_trust_score(v_store_id);
    perform public.check_and_award_seller_badges(v_store_id);
  end if;

  return new;
end;
$$;

create trigger trg_auto_calculate_trust_score_store
  after insert or update of name, description, city, phone, contact_name, contact_published
  on public.stores
  for each row
  execute function public.auto_calculate_trust_score();

create trigger trg_auto_calculate_trust_score_product
  after insert or update or delete
  on public.products
  for each row
  execute function public.auto_calculate_trust_score();

create trigger trg_auto_calculate_trust_score_subscription
  after insert or update of status
  on public.store_subscriptions
  for each row
  execute function public.auto_calculate_trust_score();

-- Backfill: award seller badges for all existing stores
do $$
declare
  r record;
begin
  for r in select id from public.stores loop
    perform public.check_and_award_seller_badges(r.id);
  end loop;
end;
$$;
