-- Auto-award user badges on relevant events

create or replace function public.auto_award_user_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if tg_table_name = 'designs' then
    select user_id into v_user_id from public.rooms where id = new.room_id;
  elsif tg_table_name = 'wishlists' then
    v_user_id := new.user_id;
  elsif tg_table_name = 'ads' then
    v_user_id := new.user_id;
  elsif tg_table_name = 'profiles' then
    v_user_id := new.id;
  else
    return new;
  end if;

  if v_user_id is not null then
    perform public.check_and_award_user_badges(v_user_id);
  end if;

  return new;
end;
$$;

create trigger trg_auto_award_user_badges_design
  after insert on public.designs
  for each row
  execute function public.auto_award_user_badges();

create trigger trg_auto_award_user_badges_wishlist
  after insert on public.wishlists
  for each row
  execute function public.auto_award_user_badges();

create trigger trg_auto_award_user_badges_ad
  after insert on public.ads
  for each row
  execute function public.auto_award_user_badges();

create trigger trg_auto_award_user_badges_profile
  after update of first_name, last_name, phone, phone_verified, avatar_url
  on public.profiles
  for each row
  execute function public.auto_award_user_badges();

-- Backfill: award user badges for existing users
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.check_and_award_user_badges(r.id);
  end loop;
end;
$$;
