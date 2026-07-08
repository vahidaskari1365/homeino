-- Homeino — AI Analysis Cache Table
-- ============================================================
-- Shared image-hash cache for Gemini-based visual analysis and
-- object matching. Avoids redundant AI calls when the same
-- image file is uploaded multiple times by the same user.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create the cache table
-- ------------------------------------------------------------
create table if not exists public.ai_analysis_cache (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  file_hash     text not null,  -- SHA-256 hex digest
  analysis_type text not null,  -- 'visual_search' | 'object_match'
  result        jsonb not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '24 hours'
);

-- ------------------------------------------------------------
-- 2. Constraints & indexes
-- ------------------------------------------------------------
alter table public.ai_analysis_cache
  add constraint ai_analysis_cache_file_hash_check
  check (length(file_hash) = 64);

alter table public.ai_analysis_cache
  add constraint ai_analysis_cache_type_check
  check (analysis_type in ('visual_search', 'object_match'));

create index ai_analysis_cache_lookup_idx
  on public.ai_analysis_cache (user_id, file_hash, analysis_type)
  where (expires_at > now());

-- ------------------------------------------------------------
-- 3. Row-level security
-- ------------------------------------------------------------
alter table public.ai_analysis_cache enable row level security;

create policy "Users can read own cache"
  on public.ai_analysis_cache for select
  using (auth.uid() = user_id);

create policy "Users can insert own cache"
  on public.ai_analysis_cache for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cache"
  on public.ai_analysis_cache for update
  using (auth.uid() = user_id);

create policy "Users can delete own cache"
  on public.ai_analysis_cache for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Auto‑cleanup expired rows (runs every hour)
-- ------------------------------------------------------------
select cron.schedule(
  'cleanup-ai-analysis-cache',
  '0 * * * *',
  $$delete from public.ai_analysis_cache where expires_at < now()$$
);
