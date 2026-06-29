-- Cached per-app keyword metrics so the keyword table loads instantly on revisit.
create table keyword_metrics (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references apps(id) on delete cascade,
  keyword_id  uuid not null references keywords(id) on delete cascade,
  volume      integer not null default 0,
  diff        integer not null default 0,
  chance      integer not null default 0,
  opportunity integer not null default 0,
  relevancy   integer not null default 0,
  rank        integer,
  updated_at  timestamptz not null default now(),
  unique (app_id, keyword_id)
);

create index on keyword_metrics (app_id);

alter table keyword_metrics enable row level security;

create policy "workspace members can read keyword_metrics"
  on keyword_metrics for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can upsert keyword_metrics"
  on keyword_metrics for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
