-- Homeino — Phase 2: Token Ledger
-- ============================================================
-- Real token ledger with wallets, wallet_transactions,
-- token_packages (for future payment gateway), and
-- token_usage_logs for per-usage tracking.
--
-- STRICT COMPLIANCE:
--   - Does NOT touch AI/Gemini pipeline tables
--   - Does NOT implement payment processing
--   - Architecture only: ready for future payment gateway
-- ============================================================

-- ------------------------------------------------------------
-- 1. WALLETS
-- One wallet per user. Automatically created on first need.
-- ------------------------------------------------------------
create table if not exists public.wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade unique,
  balance    integer not null default 0 check (balance >= 0),
  status     text not null default 'active' check (status in ('active', 'frozen', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wallets is 'One wallet per user. Balance is the canonical token balance.';
comment on column public.wallets.balance is 'Current token balance — never written directly by clients, only via SECURITY DEFINER functions.';
comment on column public.wallets.status is 'Wallet status: active, frozen (no debits), closed (no operations).';

create index if not exists idx_wallets_user_id on public.wallets(user_id);

create trigger update_wallets_updated_at
  before update on public.wallets
  for each row execute function public.update_updated_at_column();

alter table public.wallets enable row level security;

-- Users can read their own wallet
create policy "wallets_owner_select" on public.wallets
  for select using (auth.uid() = user_id);

-- No insert/update/delete — only SECURITY DEFINER functions write to wallets

-- ------------------------------------------------------------
-- 2. WALLET TRANSACTIONS
-- Every credit/debit on a wallet with full audit trail.
-- ------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id             uuid primary key default gen_random_uuid(),
  wallet_id      uuid not null references public.wallets(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  credit         integer not null default 0 check (credit >= 0),
  debit          integer not null default 0 check (debit >= 0),
  balance_after  integer not null,
  reason         text not null check (reason in (
                    'free_design_used',
                    'ai_design_used',
                    'token_package_purchase',
                    'admin_credit',
                    'admin_debit',
                    'refund',
                    'promotion_bonus'
                  )),
  reference_type text,
  reference_id   uuid,
  description    text,
  created_at     timestamptz not null default now()
);

comment on table public.wallet_transactions is 'Full audit trail: every credit/debit with balance_after.';
comment on column public.wallet_transactions.credit is 'Amount credited (>= 0). Debit must be 0 when credit > 0.';
comment on column public.wallet_transactions.debit is 'Amount debited (>= 0). Credit must be 0 when debit > 0.';

create index if not exists idx_wallet_transactions_wallet_id on public.wallet_transactions(wallet_id);
create index if not exists idx_wallet_transactions_user_id on public.wallet_transactions(user_id);
create index if not exists idx_wallet_transactions_created_at on public.wallet_transactions(created_at desc);

alter table public.wallet_transactions enable row level security;

create policy "wallet_transactions_owner_select" on public.wallet_transactions
  for select using (auth.uid() = user_id);

-- No insert/update/delete — only SECURITY DEFINER functions

-- ------------------------------------------------------------
-- 3. TOKEN PACKAGES
-- Purchaseable token packages for future payment gateway.
-- ------------------------------------------------------------
create table if not exists public.token_packages (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  description    text,
  tokens         integer not null check (tokens > 0),
  bonus_tokens   integer not null default 0 check (bonus_tokens >= 0),
  price_rial     bigint not null check (price_rial > 0),
  is_popular     boolean not null default false,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

comment on table public.token_packages is 'Token purchase packages. price_rial is in Iranian Rial. Ready for future payment gateway.';

alter table public.token_packages enable row level security;

-- Everyone (even unauthenticated) can view active packages
create policy "token_packages_public_select" on public.token_packages
  for select using (is_active = true);

-- Only admins manage packages
create policy "token_packages_admin_all" on public.token_packages
  using (public.is_admin(auth.uid()));

-- Seed default packages
insert into public.token_packages (name, slug, description, tokens, bonus_tokens, price_rial, is_popular, sort_order) values
  ('شروع',     'starter',   '۵ توکن طراحی هوشمند',           5,  0,  99000,  false, 1),
  ('معمولی',   'standard',  '۱۲ توکن + ۲ توکن هدیه',        12, 2,  199000, true,  2),
  ('حرفه‌ای',  'pro',       '۳۰ توکن + ۱۰ توکن هدیه',       30, 10, 399000, false, 3),
  ('نامحدود',  'unlimited', '۱۰۰ توکن + ۵۰ توکن هدیه',      100, 50, 899000, false, 4)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- 4. TOKEN USAGE LOGS
-- Detailed per-usage log tracking each AI design consumption.
-- ------------------------------------------------------------
create table if not exists public.token_usage_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  wallet_id        uuid not null references public.wallets(id) on delete cascade,
  transaction_id   uuid references public.wallet_transactions(id) on delete set null,
  usage_type       text not null check (usage_type in ('free_design', 'token_design')),
  tokens_consumed  integer not null default 0,
  design_id        uuid,
  room_id          uuid,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

comment on table public.token_usage_logs is 'Per-usage tracking of every AI design consumption.';

create index if not exists idx_token_usage_logs_user_id on public.token_usage_logs(user_id);
create index if not exists idx_token_usage_logs_wallet_id on public.token_usage_logs(wallet_id);
create index if not exists idx_token_usage_logs_created_at on public.token_usage_logs(created_at desc);

alter table public.token_usage_logs enable row level security;

create policy "token_usage_logs_owner_select" on public.token_usage_logs
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. FUNCTIONS
-- ------------------------------------------------------------

-- Ensure a wallet exists for a user (idempotent)
create or replace function public.ensure_wallet(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
begin
  -- Try existing
  select id into v_wallet_id from public.wallets where user_id = p_user_id;
  if found then
    return v_wallet_id;
  end if;

  -- Create new wallet, inherit existing token_balance from profiles
  insert into public.wallets (user_id, balance)
    select p_user_id, coalesce(token_balance, 0)
    from public.profiles
    where id = p_user_id
    returning id into v_wallet_id;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return v_wallet_id;
end;
$$;

-- Credit a wallet (for future payment gateway / admin / promotions)
create or replace function public.credit_wallet(
  p_user_id      uuid,
  p_amount       integer,
  p_reason       text,
  p_description  text default null,
  p_ref_type     text default null,
  p_ref_id       uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  -- Ensure wallet exists
  v_wallet_id := public.ensure_wallet(p_user_id);

  -- Update balance
  update public.wallets
    set balance = balance + p_amount
    where id = v_wallet_id
    returning balance into v_new_balance;

  -- Record transaction
  insert into public.wallet_transactions
    (wallet_id, user_id, credit, debit, balance_after, reason, reference_type, reference_id, description)
  values
    (v_wallet_id, p_user_id, p_amount, 0, v_new_balance, p_reason, p_ref_type, p_ref_id, p_description);

  -- Sync profiles.token_balance for backward compatibility
  update public.profiles set token_balance = v_new_balance where id = p_user_id;

  return jsonb_build_object(
    'wallet_id', v_wallet_id,
    'balance', v_new_balance,
    'credited', p_amount
  );
end;
$$;

-- Debit a wallet (consume tokens for AI design, etc.)
create or replace function public.debit_wallet(
  p_user_id      uuid,
  p_amount       integer,
  p_reason       text,
  p_description  text default null,
  p_ref_type     text default null,
  p_ref_id       uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_current_balance integer;
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  -- Ensure wallet exists
  v_wallet_id := public.ensure_wallet(p_user_id);

  -- Lock wallet row for atomic check
  select balance into v_current_balance
    from public.wallets
    where id = v_wallet_id
    for update;

  if v_current_balance < p_amount then
    raise exception 'insufficient_balance' using detail = format('Need %s, have %s', p_amount, v_current_balance);
  end if;

  v_new_balance := v_current_balance - p_amount;

  update public.wallets
    set balance = v_new_balance
    where id = v_wallet_id;

  -- Record transaction
  insert into public.wallet_transactions
    (wallet_id, user_id, credit, debit, balance_after, reason, reference_type, reference_id, description)
  values
    (v_wallet_id, p_user_id, 0, p_amount, v_new_balance, p_reason, p_ref_type, p_ref_id, p_description);

  -- Sync profiles.token_balance for backward compatibility
  update public.profiles set token_balance = v_new_balance where id = p_user_id;

  return jsonb_build_object(
    'wallet_id', v_wallet_id,
    'balance', v_new_balance,
    'debited', p_amount
  );
end;
$$;

-- ------------------------------------------------------------
-- 6. UPGRADE consume_design_credit to use wallet
-- Maintains backward compatibility with the old function signature.
-- First 3 designs are free, then 1 token per design.
-- ------------------------------------------------------------
create or replace function public.consume_design_credit(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
  v_limit int;
  v_wallet_id uuid;
  v_balance int;
  v_tx_id uuid;
  v_result jsonb;
begin
  -- Ensure wallet exists
  v_wallet_id := public.ensure_wallet(p_user_id);

  -- Read current free quota status
  select free_designs_used, free_designs_limit
    into v_used, v_limit
    from public.profiles
    where id = p_user_id
    for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  -- Get wallet balance
  select balance into v_balance from public.wallets where id = v_wallet_id;

  -- FREE TIER: consume a free design slot
  if v_used < v_limit then
    update public.profiles
      set free_designs_used = free_designs_used + 1
      where id = p_user_id;

    -- Record wallet transaction (0 credit/debit, just a free usage marker)
    insert into public.wallet_transactions
      (wallet_id, user_id, credit, debit, balance_after, reason)
    values
      (v_wallet_id, p_user_id, 0, 0, v_balance, 'free_design_used')
    returning id into v_tx_id;

    -- Log usage
    insert into public.token_usage_logs
      (user_id, wallet_id, transaction_id, usage_type, tokens_consumed)
    values
      (p_user_id, v_wallet_id, v_tx_id, 'free_design', 0);

    return jsonb_build_object(
      'source', 'free',
      'free_designs_remaining', v_limit - (v_used + 1),
      'token_balance', v_balance
    );
  end if;

  -- PAID TIER: consume 1 token
  if v_balance > 0 then
    v_result := public.debit_wallet(
      p_user_id => p_user_id,
      p_amount  => 1,
      p_reason  => 'ai_design_used',
      p_description => 'AI design token consumption'
    );

    v_balance := (v_result->>'balance')::int;
    v_tx_id := null;
    select id into v_tx_id from public.wallet_transactions
      where wallet_id = v_wallet_id
      order by created_at desc limit 1;

    -- Log usage
    insert into public.token_usage_logs
      (user_id, wallet_id, transaction_id, usage_type, tokens_consumed)
    values
      (p_user_id, v_wallet_id, v_tx_id, 'token_design', 1);

    return jsonb_build_object(
      'source', 'token',
      'free_designs_remaining', 0,
      'token_balance', v_balance
    );
  end if;

  raise exception 'insufficient_credit';
end;
$$;

-- Upgrade credit_tokens to use wallet
create or replace function public.credit_tokens(p_user_id uuid, p_amount int, p_reason text default 'purchase')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.credit_wallet(
    p_user_id => p_user_id,
    p_amount  => p_amount,
    p_reason  => p_reason,
    p_description => case
      when p_reason = 'purchase' then 'Token package purchase'
      when p_reason = 'refund' then 'Token refund'
      when p_reason = 'admin_adjustment' then 'Admin adjustment'
      else 'Token credit'
    end
  );
end;
$$;