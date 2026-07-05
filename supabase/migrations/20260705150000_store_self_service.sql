-- ============================================================
-- Homeino — Self-service store onboarding
-- ============================================================
-- The seller dashboard lets a signed-in user create their own store (and become
-- a seller). The previous stores INSERT policy required profiles.role='seller',
-- which no user has by default ('user'), making store creation impossible from
-- the dashboard. Relax INSERT to "owner creates their own store"; the app sets
-- profiles.role='seller' at creation time (allowed by profiles_self_update).
-- ============================================================

drop policy if exists "stores_seller_insert" on public.stores;
create policy "stores_seller_insert" on public.stores
  for insert to authenticated
  with check (auth.uid() = owner_id);
