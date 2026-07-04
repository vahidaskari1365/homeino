-- ============================================================
-- Homeino — AI Interior Design Marketplace
-- Database Schema Migration
-- ============================================================

-- 0. Extensions
-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'user' check (role in ('user', 'seller', 'admin')),
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- 2. Stores
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  city        text,
  rating      float default 0 check (rating >= 0 and rating <= 5),
  created_at  timestamptz not null default now()
);

-- 3. Products
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  category    text not null default 'other',
  style       text default 'modern',
  price       bigint not null check (price > 0),
  width       float,
  height      float,
  depth       float,
  image_url   text not null,
  ai_ready_url text,
  tags        text[] default '{}',
  created_at  timestamptz not null default now()
);

-- 4. Rooms
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  image_url   text not null,
  budget      bigint,
  created_at  timestamptz not null default now()
);

-- 5. Designs
create table if not exists public.designs (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  style       text,
  total_price bigint default 0,
  consultation text,
  created_at  timestamptz not null default now()
);

-- 6. Placements (product overlays on room)
create table if not exists public.placements (
  id          uuid primary key default gen_random_uuid(),
  design_id   uuid not null references public.designs(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  x           float not null check (x >= 0 and x <= 100),
  y           float not null check (y >= 0 and y <= 100),
  scale       float default 1.0 check (scale >= 0.1 and scale <= 3.0),
  rotation    float default 0 check (rotation >= -180 and rotation <= 180),
  confidence  float check (confidence >= 0 and confidence <= 1),
  reason      text,
  created_at  timestamptz not null default now()
);

-- 7. AI Logs
create table if not exists public.ai_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  room_id     uuid references public.rooms(id) on delete set null,
  prompt      text,
  response    jsonb,
  model       text default 'gemini-1.5-flash',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index idx_products_store_id on public.products(store_id);
create index idx_products_category on public.products(category);
create index idx_products_style on public.products(style);
create index idx_products_price on public.products(price);
create index idx_rooms_user_id on public.rooms(user_id);
create index idx_designs_room_id on public.designs(room_id);
create index idx_placements_design_id on public.placements(design_id);
create index idx_ai_logs_user_id on public.ai_logs(user_id);
create index idx_stores_owner_id on public.stores(owner_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.rooms enable row level security;
alter table public.designs enable row level security;
alter table public.placements enable row level security;
alter table public.ai_logs enable row level security;

-- Profiles: users read/update only their own
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Stores: public read, sellers manage own
create policy "stores_public_select"
  on public.stores for select
  using (true);

create policy "stores_seller_insert"
  on public.stores for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'seller')
    and auth.uid() = owner_id
  );

create policy "stores_seller_update"
  on public.stores for update
  using (auth.uid() = owner_id);

create policy "stores_seller_delete"
  on public.stores for delete
  using (auth.uid() = owner_id);

-- Products: public read, sellers manage own
create policy "products_public_select"
  on public.products for select
  using (true);

create policy "products_seller_insert"
  on public.products for insert
  with check (
    exists (
      select 1 from public.stores
      where id = store_id and owner_id = auth.uid()
    )
  );

create policy "products_seller_update"
  on public.products for update
  using (
    exists (
      select 1 from public.stores
      where id = store_id and owner_id = auth.uid()
    )
  );

create policy "products_seller_delete"
  on public.products for delete
  using (
    exists (
      select 1 from public.stores
      where id = store_id and owner_id = auth.uid()
    )
  );

-- Rooms: users manage own
create policy "rooms_user_select"
  on public.rooms for select
  using (auth.uid() = user_id);

create policy "rooms_user_insert"
  on public.rooms for insert
  with check (auth.uid() = user_id);

create policy "rooms_user_update"
  on public.rooms for update
  using (auth.uid() = user_id);

create policy "rooms_user_delete"
  on public.rooms for delete
  using (auth.uid() = user_id);

-- Designs: users access own
create policy "designs_user_select"
  on public.designs for select
  using (
    exists (
      select 1 from public.rooms
      where id = room_id and user_id = auth.uid()
    )
  );

create policy "designs_user_insert"
  on public.designs for insert
  with check (
    exists (
      select 1 from public.rooms
      where id = room_id and user_id = auth.uid()
    )
  );

create policy "designs_user_update"
  on public.designs for update
  using (
    exists (
      select 1 from public.rooms
      where id = room_id and user_id = auth.uid()
    )
  );

create policy "designs_user_delete"
  on public.designs for delete
  using (
    exists (
      select 1 from public.rooms
      where id = room_id and user_id = auth.uid()
    )
  );

-- Placements: accessible through user-owned designs
create policy "placements_user_select"
  on public.placements for select
  using (
    exists (
      select 1 from public.designs
      join public.rooms on rooms.id = designs.room_id
      where designs.id = design_id and rooms.user_id = auth.uid()
    )
  );

create policy "placements_user_insert"
  on public.placements for insert
  with check (
    exists (
      select 1 from public.designs
      join public.rooms on rooms.id = designs.room_id
      where designs.id = design_id and rooms.user_id = auth.uid()
    )
  );

create policy "placements_user_delete"
  on public.placements for delete
  using (
    exists (
      select 1 from public.designs
      join public.rooms on rooms.id = designs.room_id
      where designs.id = design_id and rooms.user_id = auth.uid()
    )
  );

-- AI Logs: only owner
create policy "ai_logs_owner_select"
  on public.ai_logs for select
  using (auth.uid() = user_id);

create policy "ai_logs_owner_insert"
  on public.ai_logs for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'user'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();