-- Repoints the three Vault-bridge RPCs (see 20260722000003_app_store_connection_rpcs.sql
-- for why these exist and the access split) at app_store_credentials — the
-- shared-per-(workspace,store,bundle_id) table introduced in
-- 20260722000005_app_store_credentials.sql — instead of the old one-secret-
-- per-country-app-row model. Signatures are unchanged (still just p_app_id):
-- callers pass whichever country's app_id the user is looking at, and these
-- resolve that to the app's (workspace_id, store, bundle_id) internally.

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
  v_store public.app_store;
  v_bundle_id text;
  v_existing_secret_id uuid;
  v_new_secret_id uuid;
  v_sibling_id uuid;
begin
  select workspace_id, store, bundle_id into v_workspace_id, v_store, v_bundle_id
  from public.apps where id = p_app_id;
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
  from public.app_store_credentials
  where workspace_id = v_workspace_id and store = v_store and bundle_id = v_bundle_id;

  if v_existing_secret_id is not null then
    -- Reconnect / credential rotation: replace the secret in place rather
    -- than creating a new one, so a re-connect doesn't orphan the old key.
    -- Every country sharing this bundle picks up the rotated key immediately
    -- since they all resolve to this same row.
    perform vault.update_secret(v_existing_secret_id, p_credential::text);
    update public.app_store_credentials
      set display_label = p_display_label, updated_at = now()
      where workspace_id = v_workspace_id and store = v_store and bundle_id = v_bundle_id;
  else
    v_new_secret_id := vault.create_secret(p_credential::text, 'app_store_credential_' || v_workspace_id::text || '_' || v_bundle_id);
    insert into public.app_store_credentials (workspace_id, store, bundle_id, vault_secret_id, display_label)
    values (v_workspace_id, v_store, v_bundle_id, v_new_secret_id, p_display_label);
  end if;

  -- Fan the connection out to every country this app is tracked under (same
  -- workspace/store/bundle_id) — one credential covers every storefront, so
  -- every sibling should read as connected immediately instead of requiring
  -- the same credential re-entered per country. Clears any prior error state
  -- too, since a fresh/rotated credential invalidates whatever caused it.
  for v_sibling_id in
    select id from public.apps
    where workspace_id = v_workspace_id and store = v_store and bundle_id = v_bundle_id
  loop
    insert into public.app_store_connections (app_id, status, last_error)
    values (v_sibling_id, 'connected', null)
    on conflict (app_id) do update
      set status = 'connected', last_error = null, updated_at = now();
  end loop;
end;
$$;

revoke all on function connect_app_store_credential(uuid, jsonb, text) from public, anon;
grant execute on function connect_app_store_credential(uuid, jsonb, text) to authenticated;

create or replace function disconnect_app_store_credential(p_app_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_store public.app_store;
  v_bundle_id text;
begin
  select workspace_id, store, bundle_id into v_workspace_id, v_store, v_bundle_id
  from public.apps where id = p_app_id;
  if v_workspace_id is null then
    raise exception 'App not found';
  end if;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = v_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can disconnect store data.';
  end if;

  -- One credential, one disconnect: removes every sibling country's
  -- connection status row, then the shared credential itself (which fires
  -- the Vault cleanup trigger on app_store_credentials).
  delete from public.app_store_connections
  where app_id in (
    select id from public.apps
    where workspace_id = v_workspace_id and store = v_store and bundle_id = v_bundle_id
  );

  delete from public.app_store_credentials
  where workspace_id = v_workspace_id and store = v_store and bundle_id = v_bundle_id;
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
  v_workspace_id uuid;
  v_store public.app_store;
  v_bundle_id text;
  v_secret_id uuid;
  v_payload text;
begin
  select workspace_id, store, bundle_id into v_workspace_id, v_store, v_bundle_id
  from public.apps where id = p_app_id;
  if v_workspace_id is null then
    return null;
  end if;

  select vault_secret_id into v_secret_id
  from public.app_store_credentials
  where workspace_id = v_workspace_id and store = v_store and bundle_id = v_bundle_id;

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
