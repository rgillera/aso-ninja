-- Apple Search Ads connection: lets a workspace pull the real keywords its
-- apps are bidding on (campaign/ad group/keyword + bid + spend/performance)
-- from the Apple Search Ads API. Separate from app_store_credentials/
-- app_store_connections (App Store Connect / Play Console download reports)
-- — different Apple product, different credential shape (OAuth2 client
-- credentials: clientId/teamId/keyId/privateKey, no vendor number), and
-- workspace-scoped rather than per-(store,bundle_id): one Apple Search Ads
-- org can run campaigns for several of a workspace's apps at once, and
-- unlike App Store Connect sales data, ASA data isn't split per storefront
-- country. Same Vault-backed secret pattern as app_store_credentials.
create table asa_connections (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade unique,
  vault_secret_id uuid not null,
  -- Resolved server-side via GET /v1/acls right after the credential
  -- validates, not typed in by the user — see libs/asa-connections/client.ts.
  ad_account_id   text not null,
  display_label   text,
  status          text not null default 'connected' check (status in ('connected', 'error')),
  last_error      text,
  last_synced_on  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on asa_connections (workspace_id);

alter table asa_connections enable row level security;

create policy "workspace members can read asa_connections"
  on asa_connections for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

-- No insert/update/delete policy: writes go through the SECURITY DEFINER
-- RPCs below, same idiom as app_store_credentials/app_store_connections.

create or replace function cleanup_asa_connection_secrets()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from vault.secrets
  where id in (
    select vault_secret_id from deleted_asa_connections where vault_secret_id is not null
  );
  return null;
end;
$$;

create trigger trg_cleanup_asa_connection_secrets
  after delete on asa_connections
  referencing old table as deleted_asa_connections
  for each statement
  execute function cleanup_asa_connection_secrets();

-- connect_asa_credential: create-or-rotate. p_credential is
-- {clientId, teamId, keyId, privateKey} as jsonb; p_ad_account_id is
-- resolved by the caller (via GET /v1/acls) before this is called, since
-- Postgres has no business making outbound HTTP calls.
create or replace function connect_asa_credential(
  p_workspace_id uuid,
  p_credential jsonb,
  p_display_label text,
  p_ad_account_id text
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_existing_secret_id uuid;
  v_new_secret_id uuid;
begin
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can connect Apple Search Ads.';
  end if;

  select vault_secret_id into v_existing_secret_id
  from public.asa_connections where workspace_id = p_workspace_id;

  if v_existing_secret_id is not null then
    perform vault.update_secret(v_existing_secret_id, p_credential::text);
    update public.asa_connections
      set display_label = p_display_label,
          ad_account_id = p_ad_account_id,
          status = 'connected',
          last_error = null,
          updated_at = now()
      where workspace_id = p_workspace_id;
  else
    v_new_secret_id := vault.create_secret(p_credential::text, 'asa_credential_' || p_workspace_id::text);
    insert into public.asa_connections (workspace_id, vault_secret_id, display_label, ad_account_id)
    values (p_workspace_id, v_new_secret_id, p_display_label, p_ad_account_id);
  end if;
end;
$$;

revoke all on function connect_asa_credential(uuid, jsonb, text, text) from public, anon;
grant execute on function connect_asa_credential(uuid, jsonb, text, text) to authenticated;

create or replace function disconnect_asa_credential(p_workspace_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can disconnect Apple Search Ads.';
  end if;

  delete from public.asa_connections where workspace_id = p_workspace_id;
end;
$$;

revoke all on function disconnect_asa_credential(uuid) from public, anon;
grant execute on function disconnect_asa_credential(uuid) to authenticated;

-- service_role-only, same as get_app_store_credential — never callable from
-- a user-session client, only from server code using the admin client.
create or replace function get_asa_credential(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_payload text;
begin
  select vault_secret_id into v_secret_id
  from public.asa_connections where workspace_id = p_workspace_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_payload
  from vault.decrypted_secrets where id = v_secret_id;

  return v_payload::jsonb;
end;
$$;

revoke all on function get_asa_credential(uuid) from public, anon, authenticated;
grant execute on function get_asa_credential(uuid) to service_role;

-- No separate RPC for reading ad_account_id back out: it's a plain column
-- (not Vault-backed like the credential itself), so server code using the
-- admin/service-role client (which bypasses RLS entirely) can just select it
-- straight off asa_connections — see libs/asa-connections/service.ts.
