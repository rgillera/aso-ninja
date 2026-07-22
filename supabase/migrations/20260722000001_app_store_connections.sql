-- Tracks whether an app is connected to its real store data source
-- (App Store Connect Sales Reports for iOS, Play Console Cloud Storage
-- download reports for Android). Credential material itself never lives
-- here — see app_store_connection_rpcs.sql for how it's stored in Vault.
create table app_store_connections (
  id              uuid primary key default gen_random_uuid(),
  app_id          uuid not null references apps(id) on delete cascade unique,
  status          text not null default 'connected' check (status in ('connected', 'error')),
  last_error      text,
  last_synced_on  date,
  vault_secret_id uuid,
  display_label   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on app_store_connections (app_id);

alter table app_store_connections enable row level security;

create policy "workspace members can read app_store_connections"
  on app_store_connections for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

-- No insert/update/delete policy: all writes go through the SECURITY DEFINER
-- RPCs in 20260722000003_app_store_connection_rpcs.sql, which self-police
-- via an owner/admin role check instead of relying on RLS for writes.
