-- Splits the credential (App Store Connect / Play Console access) out from
-- per-country sync state. Previously app_store_connections was one row per
-- apps.id, and apps.id is one row per (workspace, store, bundle_id, country)
-- — so tracking the same app in 3 countries meant pasting the same private
-- key / service-account JSON into the connect form 3 times. The credential
-- itself doesn't vary by country (one Apple/Google account covers every
-- storefront), so it now lives exactly once per (workspace, store,
-- bundle_id) here. app_store_connections keeps its per-app_id status/
-- last_error/last_synced_on — sync freshness and failures genuinely do vary
-- per country, since libs/store-connections filters each country's own
-- report rows independently.
create table app_store_credentials (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  store           app_store not null,
  bundle_id       text not null,
  vault_secret_id uuid not null,
  display_label   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, store, bundle_id)
);

create index on app_store_credentials (workspace_id, store, bundle_id);

alter table app_store_credentials enable row level security;

create policy "workspace members can read app_store_credentials"
  on app_store_credentials for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

-- No insert/update/delete policy: writes go through the SECURITY DEFINER
-- RPCs in 20260722000006_app_store_credential_rpcs_v2.sql, same idiom as
-- app_store_connections.

-- Backfill: one credential row per (workspace, store, bundle_id), taken from
-- whichever existing app_store_connections row was connected first. Pre-this-
-- migration every country had its own independent row/secret even when
-- tracking the same app, so a bundle with several already-connected
-- countries collapses down to a single shared credential here (the other
-- countries' now-redundant secrets are cleaned up below along with the
-- columns that referenced them).
insert into app_store_credentials (workspace_id, store, bundle_id, vault_secret_id, display_label)
select distinct on (a.workspace_id, a.store, a.bundle_id)
  a.workspace_id, a.store, a.bundle_id, c.vault_secret_id, c.display_label
from app_store_connections c
join apps a on a.id = c.app_id
where c.vault_secret_id is not null
order by a.workspace_id, a.store, a.bundle_id, c.created_at asc;

-- The "distinct on" above only keeps one secret per bundle — any other
-- pre-existing secret from a bundle that already had multiple countries
-- independently connected (the exact workaround this migration removes the
-- need for) is now unreferenced by anything. Must run before the column
-- drop below removes the only pointer to them, or they'd be unrecoverable
-- dead rows in vault.secrets forever.
delete from vault.secrets
where id in (
  select c.vault_secret_id
  from app_store_connections c
  where c.vault_secret_id is not null
    and c.vault_secret_id not in (select vault_secret_id from app_store_credentials)
);

-- Drop the old secret-cleanup trigger before dropping the column it reads —
-- it references app_store_connections.vault_secret_id, which no longer
-- exists once that credential material moves to app_store_credentials.
drop trigger if exists trg_cleanup_app_store_connection_secrets on app_store_connections;
drop function if exists cleanup_app_store_connection_secrets();

alter table app_store_connections drop column vault_secret_id;
alter table app_store_connections drop column display_label;

-- Same orphaned-Vault-secret concern as the trigger just dropped (see
-- 20260722000004_cleanup_app_store_connection_secrets.sql's comment) — now
-- pointed at app_store_credentials, the table that actually holds
-- vault_secret_id going forward.
create or replace function cleanup_app_store_credential_secrets()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from vault.secrets
  where id in (
    select vault_secret_id from deleted_app_store_credentials where vault_secret_id is not null
  );
  return null;
end;
$$;

create trigger trg_cleanup_app_store_credential_secrets
  after delete on app_store_credentials
  referencing old table as deleted_app_store_credentials
  for each statement
  execute function cleanup_app_store_credential_secrets();

-- When a new country is added for an app that's already connected in another
-- country (e.g. following the US version of an app you already connected
-- under UK), wire up its connection status automatically — the credential
-- is already there in app_store_credentials, so there's nothing left for the
-- user to enter. Leaves last_synced_on null (pending, same as any other
-- freshly-connected row) so the next cron tick or manual sync populates it.
create or replace function auto_connect_new_country_app()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.app_store_credentials
    where workspace_id = new.workspace_id and store = new.store and bundle_id = new.bundle_id
  ) then
    insert into public.app_store_connections (app_id, status)
    values (new.id, 'connected')
    on conflict (app_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_auto_connect_new_country_app
  after insert on apps
  for each row
  execute function auto_connect_new_country_app();
