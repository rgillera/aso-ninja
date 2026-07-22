-- Real daily download totals pulled from App Store Connect / Play Console
-- for connected apps (see app_store_connections). Distinct from
-- keyword_volume_history, which holds public search-popularity scores, not
-- real download counts.
create table app_download_history (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references apps(id) on delete cascade,
  recorded_on date not null,
  downloads   bigint not null,
  created_at  timestamptz not null default now(),
  unique (app_id, recorded_on)
);

create index on app_download_history (app_id);

alter table app_download_history enable row level security;

create policy "workspace members can read app_download_history"
  on app_download_history for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

-- No write policy: the only writer is the service-role admin client
-- (cron sync job / manual "sync now" route), which bypasses RLS.
