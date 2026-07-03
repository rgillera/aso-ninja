-- Accumulating catalog of apps discovered via App Explorer's chart crawl.
-- Apple's and Google's chart feeds only ever show a live snapshot (capped at
-- ~100 / ~200 apps) — this table lets that snapshot build into a growing,
-- de-duplicated history over repeated crawls instead of resetting each time.
-- Global cache, not workspace-scoped: it's just re-stored public store data,
-- same trust model as keyword_popularity_snapshots.

create table market_apps (
  id              uuid primary key default gen_random_uuid(),
  store           text not null check (store in ('ios', 'android')),
  store_id        text not null,
  bundle_id       text,
  name            text not null,
  developer       text,
  icon_url        text,
  price           numeric,
  price_label     text,
  genre           text,
  url             text,
  rating          numeric,
  rating_count    integer,
  app_updated_at  timestamptz,
  last_rank       integer,
  last_chart      text,
  last_category   text,
  last_country    text,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  unique (store, store_id)
);

create index on market_apps (store);
create index on market_apps (last_seen_at desc);
create index on market_apps (last_category);

-- Public read, public upsert (global/cached data, not user-sensitive) — same
-- policy shape as keyword_popularity_snapshots.
alter table market_apps enable row level security;

create policy "public read market apps"
  on market_apps for select
  using (true);

create policy "public insert market apps"
  on market_apps for insert
  with check (true);

create policy "public update market apps"
  on market_apps for update
  using (true);
