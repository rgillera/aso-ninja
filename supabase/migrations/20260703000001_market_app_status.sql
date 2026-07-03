-- Market app status — growth team's per-workspace outreach tracker for apps
-- surfaced in App Explorer (which browses Apple's public charts, not tracked apps).

create table market_app_status (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  store        app_store not null default 'ios',
  store_id     text not null,
  connected    boolean not null default false,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, store, store_id)
);

create index on market_app_status (workspace_id);

-- RLS
alter table market_app_status enable row level security;

create policy "workspace members can read market app status"
  on market_app_status for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can manage market app status"
  on market_app_status for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));
