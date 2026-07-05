-- Homeino — Phase 1: Tracking Engine Upgrade
-- ============================================================
-- Extends analytics_events with store-scoped, device-aware columns
-- and ALL event types required for the SaaS business layer.
--
-- STRICT COMPLIANCE:
--   - Does NOT touch any AI/Gemini pipeline table (ai_logs, rooms,
--     designs, placements).
--   - Does NOT modify any existing RLS policy — only adds new columns.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add new columns to analytics_events
-- ------------------------------------------------------------
alter table public.analytics_events
  add column if not exists store_id uuid references public.stores(id) on delete set null,
  add column if not exists ip text,
  add column if not exists device text,
  add column if not exists platform text;

comment on column public.analytics_events.store_id is 'Nullable store context for seller-scoped events (Store Viewed, Store Followed, Ad Created etc.)';
comment on column public.analytics_events.ip is 'Client IP address (best-effort, optional)';
comment on column public.analytics_events.device is 'Device fingerprint: mobile|tablet|desktop|bot';
comment on column public.analytics_events.platform is 'Platform identifier: web|ios|android|api';

-- ------------------------------------------------------------
-- 2. Drop old event_type CHECK constraint and recreate
-- ------------------------------------------------------------
alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    -- Auth / Profile
    'user_registered',
    'user_login',
    'user_logout',
    'profile_updated',
    'profile_completed',
    -- Rooms / Uploads
    'room_uploaded',
    -- AI Design Pipeline
    'ai_started',
    'ai_finished',
    'ai_failed',
    'design_saved',
    'design_deleted',
    -- Projects
    'project_created',
    'project_updated',
    'project_deleted',
    -- Products
    'product_suggested',
    'product_viewed',
    'product_clicked',
    'product_favorited',
    'product_unfavorited',
    -- Advertisements (Seller Dashboard)
    'ad_created',
    'ad_updated',
    'ad_deleted',
    'ad_viewed',
    -- Notifications
    'notification_read',
    -- Premium / Subscription
    'premium_viewed',
    'subscription_viewed',
    -- Token Economy
    'token_consumed',
    'token_added',
    -- Addresses
    'address_added',
    'address_updated',
    'address_deleted',
    -- Store
    'store_viewed',
    'store_followed'
  ));

-- ------------------------------------------------------------
-- 3. Additional indexes for new query patterns
-- ------------------------------------------------------------
create index if not exists idx_analytics_events_store_id
  on public.analytics_events(store_id);
create index if not exists idx_analytics_events_event_created
  on public.analytics_events(event_type, created_at desc);