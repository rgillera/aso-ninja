-- Global keyword popularity snapshots (one row per term/store/country/day).
-- No user context — this is aggregated public signal data.

create table keyword_popularity_snapshots (
  id          uuid primary key default gen_random_uuid(),
  term        text not null,
  store       text not null check (store in ('ios', 'android')),
  country     text not null,
  score       integer not null check (score between 0 and 100),
  recorded_on date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (term, store, country, recorded_on)
);

create index on keyword_popularity_snapshots (term, store, country, recorded_on desc);

-- Public read, public insert (global/aggregated data, not user-sensitive)
alter table keyword_popularity_snapshots enable row level security;

create policy "public read popularity snapshots"
  on keyword_popularity_snapshots for select
  using (true);

create policy "public insert popularity snapshots"
  on keyword_popularity_snapshots for insert
  with check (true);
