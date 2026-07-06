-- Phase 12: Immutable Audit Log System
-- Append-only. Records must NEVER be modified or deleted.

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid not null,
  actor_type      text not null check (actor_type in ('user', 'seller', 'admin', 'system')),
  target_type     text not null,
  target_id       uuid,
  action          text not null,
  old_values      jsonb not null default '{}',
  new_values      jsonb not null default '{}',
  ip_address      text,
  user_agent      text,
  session_id      text,
  request_id      text,
  created_at      timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable audit log. Append-only. Records must never be modified or deleted.';

-- Indexes for filtering and search performance
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id, actor_type);
create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_date_range on public.audit_logs(created_at) where created_at >= now() - interval '90 days';
create index if not exists idx_audit_logs_actor_type on public.audit_logs(actor_type);
create index if not exists idx_audit_logs_target_type on public.audit_logs(target_type);
create index if not exists idx_audit_logs_lookup on public.audit_logs(actor_id, target_type, action, created_at);

-- RLS: immutable by default
alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_admin(auth.uid()));

-- No insert policy for direct table access (use helper function only)
-- No update or delete policies (immutable)

-- Helper function: insert audit log (SECURITY DEFINER so system can write)
create or replace function public.create_audit_log(
  p_actor_id uuid,
  p_actor_type text,
  p_target_type text,
  p_target_id uuid default null,
  p_action text default null,
  p_old_values jsonb default '{}',
  p_new_values jsonb default '{}',
  p_ip_address text default null,
  p_user_agent text default null,
  p_session_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (
    actor_id, actor_type, target_type, target_id, action,
    old_values, new_values, ip_address, user_agent, session_id,
    request_id
  ) values (
    p_actor_id, p_actor_type, p_target_type, p_target_id, p_action,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id,
    current_setting('request.headers', true)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Convenience wrappers for common actor types
create or replace function public.create_user_audit_log(
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid default null,
  p_action text default null,
  p_old_values jsonb default '{}',
  p_new_values jsonb default '{}'
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.create_audit_log(
    p_actor_id, 'user', p_target_type, p_target_id, p_action,
    p_old_values, p_new_values
  );
$$;

create or replace function public.create_seller_audit_log(
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid default null,
  p_action text default null,
  p_old_values jsonb default '{}',
  p_new_values jsonb default '{}'
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.create_audit_log(
    p_actor_id, 'seller', p_target_type, p_target_id, p_action,
    p_old_values, p_new_values
  );
$$;

create or replace function public.create_admin_audit_log(
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid default null,
  p_action text default null,
  p_old_values jsonb default '{}',
  p_new_values jsonb default '{}'
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.create_audit_log(
    p_actor_id, 'admin', p_target_type, p_target_id, p_action,
    p_old_values, p_new_values
  );
$$;

create or replace function public.create_system_audit_log(
  p_target_type text,
  p_target_id uuid default null,
  p_action text default null,
  p_old_values jsonb default '{}',
  p_new_values jsonb default '{}'
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.create_audit_log(
    '00000000-0000-0000-0000-000000000000', 'system',
    p_target_type, p_target_id, p_action,
    p_old_values, p_new_values
  );
$$;

-- Admin RPC: search/filter audit logs
create or replace function public.admin_search_audit_logs(
  p_actor_id uuid default null,
  p_actor_type text default null,
  p_target_type text default null,
  p_action text default null,
  p_from_date timestamptz default null,
  p_to_date timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'total', (select count(*) from public.audit_logs al where
      (p_actor_id is null or al.actor_id = p_actor_id) and
      (p_actor_type is null or al.actor_type = p_actor_type) and
      (p_target_type is null or al.target_type = p_target_type) and
      (p_action is null or al.action = p_action) and
      (p_from_date is null or al.created_at >= p_from_date) and
      (p_to_date is null or al.created_at <= p_to_date)
    ),
    'logs', (select jsonb_agg(sub) from (
      select al.* from public.audit_logs al where
        (p_actor_id is null or al.actor_id = p_actor_id) and
        (p_actor_type is null or al.actor_type = p_actor_type) and
        (p_target_type is null or al.target_type = p_target_type) and
        (p_action is null or al.action = p_action) and
        (p_from_date is null or al.created_at >= p_from_date) and
        (p_to_date is null or al.created_at <= p_to_date)
      order by al.created_at desc
      limit p_limit offset p_offset
    ) sub)
  ) into v_result;

  return v_result;
end;
$$;
