-- Daily keyword ranking snapshots: which app was at each position on a given day.
-- Written whenever a user opens Live Search for a keyword.

create table keyword_rankings_history (
  id          uuid primary key default gen_random_uuid(),
  keyword     text not null,
  store       text not null check (store in ('ios', 'android')),
  country     text not null,
  recorded_on date not null default current_date,
  position    integer not null,
  app_id      text not null,
  app_name    text not null,
  app_icon    text not null,
  created_at  timestamptz not null default now(),
  unique (keyword, store, country, recorded_on, position)
);

create index on keyword_rankings_history (keyword, store, country, recorded_on desc);

alter table keyword_rankings_history enable row level security;

create policy "public read rankings history"
  on keyword_rankings_history for select
  using (true);

create policy "public insert rankings history"
  on keyword_rankings_history for insert
  with check (true);

create policy "public upsert rankings history"
  on keyword_rankings_history for update
  using (true);
