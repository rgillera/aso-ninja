-- Rank alerts — trigger notifications when rank crosses a threshold

create type alert_condition as enum ('dropped_below', 'improved_above');

create table rank_alerts (
  id           uuid primary key default gen_random_uuid(),
  app_id       uuid not null references apps(id) on delete cascade,
  keyword_id   uuid not null references keywords(id) on delete cascade,
  condition    alert_condition not null,
  threshold    integer not null,
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index on rank_alerts (app_id, is_active);

-- RLS
alter table rank_alerts enable row level security;

create policy "workspace members can read rank alerts"
  on rank_alerts for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can manage rank alerts"
  on rank_alerts for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
