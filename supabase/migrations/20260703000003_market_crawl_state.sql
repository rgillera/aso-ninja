-- Single-row cursor so the market-apps crawl (see /api/cron/crawl-market-apps)
-- can resume where it left off across runs instead of restarting from zero
-- each time. Needed once the crawl spans every country: the full combo space
-- (countries x categories x chart types x stores) is far larger than what
-- fits in one Hobby-tier (60s) function invocation, so progress accumulates
-- a little per day and cycles through the whole space over time.

create table market_crawl_state (
  id         integer primary key default 1 check (id = 1),
  cursor     bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into market_crawl_state (id, cursor) values (1, 0);

-- Public read/update, same trust model as market_apps — this is just crawl
-- bookkeeping, not user data.
alter table market_crawl_state enable row level security;

create policy "public read market crawl state"
  on market_crawl_state for select
  using (true);

create policy "public update market crawl state"
  on market_crawl_state for update
  using (true);
