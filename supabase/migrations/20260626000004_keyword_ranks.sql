-- Keyword rank snapshots — high-volume append-only table

create table keyword_ranks (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references apps(id) on delete cascade,
  keyword_id  uuid not null references keywords(id) on delete cascade,
  store       app_store not null,
  rank        integer,              -- null means not ranked (outside top N)
  rank_change integer,              -- delta from previous snapshot, computed at write time
  tracked_on  date not null default current_date
);

create index on keyword_ranks (app_id, keyword_id, store, tracked_on desc);

-- RLS
alter table keyword_ranks enable row level security;

create policy "workspace members can read keyword ranks"
  on keyword_ranks for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "service role can insert keyword ranks"
  on keyword_ranks for insert
  with check (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
