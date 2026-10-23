create table public.garmin_connections (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null default 'disconnected' check (status in ('disconnected','pending_mfa','connected','reconnect_required')),
  encrypted_session text check (length(encrypted_session) <= 750000),
  garmin_account_id text unique,
  consent_at timestamptz,
  consent_version text,
  last_synced_at timestamptz,
  last_error text,
  lease_id uuid,
  lease_until timestamptz,
  last_attempt_at timestamptz,
  mfa_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.garmin_connections enable row level security;
revoke all on public.garmin_connections from public, anon, authenticated;
grant select,insert,update,delete on public.garmin_connections to service_role;
comment on table public.garmin_connections is 'Backend-only encrypted Garmin tokens and temporary MFA sessions; no client or admin table access.';

-- SECURITY INVOKER and service-role-only grant: no privileged anonymous wrapper.
create function public.sage_claim_garmin(p_user_id uuid,p_lease_id uuid,p_action text)
returns jsonb language plpgsql security invoker set search_path = public,pg_temp as $$
declare connection public.garmin_connections;
begin
  if p_action not in ('connect','mfa','sync','disconnect') then raise exception 'Invalid action'; end if;
  if not exists(select 1 from public.users where id=p_user_id and role='athlete' and status<>'suspended') then
    raise exception 'An eligible athlete account is required' using errcode='42501';
  end if;
  insert into public.garmin_connections(user_id) values(p_user_id) on conflict do nothing;
  select * into connection from public.garmin_connections where user_id=p_user_id for update;
  if connection.lease_until>now() then raise exception 'Garmin request already running' using errcode='55P03'; end if;
  if p_action<>'disconnect' and connection.last_attempt_at>now()-interval '15 seconds' then
    raise exception 'Wait 15 seconds before trying again' using errcode='55P03';
  end if;
  update public.garmin_connections set lease_id=p_lease_id,lease_until=now()+interval '5 minutes',last_attempt_at=now(),updated_at=now()
  where user_id=p_user_id returning * into connection;
  return to_jsonb(connection);
end; $$;
revoke all on function public.sage_claim_garmin(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sage_claim_garmin(uuid,uuid,text) to service_role;
