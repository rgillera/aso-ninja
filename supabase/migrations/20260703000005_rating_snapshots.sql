-- Daily rating snapshots per app: recorded whenever the Ratings dashboard is
-- viewed (same convention as keyword_rankings_history), since the App Store
-- and Play Store public APIs only ever expose a live snapshot, never history.

create table rating_snapshots (
  id           uuid primary key default gen_random_uuid(),
  app_id       uuid not null references apps(id) on delete cascade,
  recorded_on  date not null default current_date,
  rating       numeric,
  rating_count bigint,
  histogram    jsonb,
  created_at   timestamptz not null default now(),
  unique (app_id, recorded_on)
);

create index on rating_snapshots (app_id, recorded_on desc);

alter table rating_snapshots enable row level security;

create policy "workspace members can manage rating snapshots"
  on rating_snapshots for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
