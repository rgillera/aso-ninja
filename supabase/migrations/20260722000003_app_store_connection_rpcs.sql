-- Credential material (.p8 keys, service-account JSON) is never stored in a
-- plain table — it's kept in Supabase Vault, with only the secret's uuid
-- referenced from app_store_connections. PostgREST only exposes the public/
-- graphql_public schemas (see supabase/config.toml), so vault.* is otherwise
-- unreachable from the app's Supabase clients — these three functions are
-- the only bridge, and access is split deliberately:
--   - connect/disconnect stay callable by `authenticated` and self-police
--     via an in-body owner/admin role check (same idiom as
--     20260704000005_app_competitors.sql's limit-enforcement triggers).
--   - get_app_store_credential decrypts and returns the raw credential, so
--     it is locked to `service_role` only (see revoke/grant below) — the
--     admin client (cron sync job / manual "sync now" route) is the only
--     caller. If this were left callable by `authenticated`, any logged-in
--     user could pass an arbitrary app_id and read another workspace's
--     private key.

create or replace function connect_app_store_credential(
  p_app_id uuid,
  p_credential jsonb,
  p_display_label text
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_existing_secret_id uuid;
  v_new_secret_id uuid;
begin
  select workspace_id into v_workspace_id from public.apps where id = p_app_id;
  if v_workspace_id is null then
    raise exception 'App not found';
  end if;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = v_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can connect store data.';
  end if;

  select vault_secret_id into v_existing_secret_id
  from public.app_store_connections where app_id = p_app_id;

  if v_existing_secret_id is not null then
    -- Reconnect / credential rotation: replace the secret in place rather
    -- than creating a new one, so a re-connect doesn't orphan the old key.
    perform vault.update_secret(v_existing_secret_id, p_credential::text);
    update public.app_store_connections
      set status = 'connected', last_error = null, display_label = p_display_label, updated_at = now()
      where app_id = p_app_id;
  else
    v_new_secret_id := vault.create_secret(p_credential::text, 'app_store_connection_' || p_app_id::text);
    insert into public.app_store_connections (app_id, status, vault_secret_id, display_label)
    values (p_app_id, 'connected', v_new_secret_id, p_display_label);
  end if;
end;
$$;

-- Supabase's project bootstrap grants EXECUTE on new public-schema functions
-- to anon/authenticated/service_role by default privileges, independent of
-- `public` (the pseudo-role) — `revoke ... from public` alone doesn't strip
-- that, so anon is revoked explicitly. The in-body role check already makes
-- an anon call harmless, but there's no reason to leave it reachable at all.
revoke all on function connect_app_store_credential(uuid, jsonb, text) from public, anon;
grant execute on function connect_app_store_credential(uuid, jsonb, text) to authenticated;

-- Vault cleanup for the deleted row's secret happens via the
-- trg_cleanup_app_store_connection_secrets trigger on app_store_connections
-- (see 20260722000004_cleanup_app_store_connection_secrets.sql) — defined
-- there rather than here so it also covers rows removed by a path other
-- than this RPC (e.g. the FK cascade from unfollowing an app).
create or replace function disconnect_app_store_credential(p_app_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from public.apps where id = p_app_id;
  if v_workspace_id is null then
    raise exception 'App not found';
  end if;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = v_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can disconnect store data.';
  end if;

  delete from public.app_store_connections where app_id = p_app_id;
end;
$$;

revoke all on function disconnect_app_store_credential(uuid) from public, anon;
grant execute on function disconnect_app_store_credential(uuid) to authenticated;

create or replace function get_app_store_credential(p_app_id uuid)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_payload text;
begin
  select vault_secret_id into v_secret_id
  from public.app_store_connections where app_id = p_app_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_payload
  from vault.decrypted_secrets where id = v_secret_id;

  return v_payload::jsonb;
end;
$$;

revoke all on function get_app_store_credential(uuid) from public, anon, authenticated;
grant execute on function get_app_store_credential(uuid) to service_role;
