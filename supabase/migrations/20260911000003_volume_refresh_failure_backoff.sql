-- stale_keywords_for_refresh only ever looks at the *last successful*
-- volume/rank write (keyword_volume_history / keyword_rankings_history are
-- only ever written on success) — a failed attempt (network error, a
-- non-403 bad response, a scraper exception) leaves last_volume/last_rank
-- untouched, so the term stays maximally "stale" and gets retried on every
-- single subsequent cron run (every ~30 min, vercel.json) with no backoff
-- at all. Fine for a transient blip, but a term that fails *every* time
-- (a malformed query, a scraper edge case) would then permanently occupy a
-- slot in every run's p_limit batch, at the very front of the fairness
-- ordering (it's always the most "overdue"), crowding out other terms that
-- are actually able to succeed.
--
-- This tracks failures separately from the real history tables so
-- stale_keywords_for_refresh can back a chronically-failing term off for a
-- few hours instead of hammering it every run forever — while a term that's
-- simply never been checked yet (attempts = 0, no row here) still gets
-- picked up immediately, same as before.
create table public.keyword_refresh_failures (
  term           text not null,
  store          text not null check (store in ('ios', 'android')),
  country        text not null,
  attempts       integer not null default 1,
  last_failed_on timestamptz not null default now(),
  primary key (term, store, country)
);

-- Purely internal cron bookkeeping — no policies at all, so anon/
-- authenticated get nothing; only the refresh-keywords cron (service role,
-- bypasses RLS) and stale_keywords_for_refresh (security definer) touch it.
alter table public.keyword_refresh_failures enable row level security;

-- Atomic increment-or-insert — a plain PostgREST upsert can't reference the
-- existing `attempts` value, so this is a tiny RPC instead. Called from
-- refresh-keywords on a real per-term failure (not a 403 — that's Apple
-- globally rate-limiting us, not this term's fault, so it isn't held against
-- the term specifically).
create or replace function public.record_keyword_refresh_failure(p_term text, p_store text, p_country text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.keyword_refresh_failures (term, store, country, attempts, last_failed_on)
  values (p_term, p_store, p_country, 1, now())
  on conflict (term, store, country) do update
    set attempts = public.keyword_refresh_failures.attempts + 1,
        last_failed_on = now();
$$;

grant execute on function public.record_keyword_refresh_failure(text, text, text) to service_role;

-- Same three-part shape as 20260911000001's fix, plus a failure-backoff
-- exclusion: a term that failed recently is skipped until
-- least(attempts, 6) * 2h has passed (2h after a first failure, capped at
-- 12h for a chronic one) — long enough to stop hammering a broken query
-- every 30 minutes, nowhere near the month-long wait a missed check would
-- otherwise imply.
create or replace function public.stale_keywords_for_refresh(p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
set search_path = ''
as $$
  with tracked as (
    select distinct k.term, a.store::text as store, lower(a.country) as country
    from public.keywords k
    join public.app_keywords ak on ak.keyword_id = k.id
    join public.apps a on a.id = ak.app_id
    where k.status = 'active'
  ),
  volume_last as (
    select v.term, v.store, v.country, max(v.recorded_on) as last_volume
    from public.keyword_volume_history v
    group by v.term, v.store, v.country
  ),
  rank_last as (
    select r.keyword as term, r.store, r.country, max(r.recorded_on) as last_rank
    from public.keyword_rankings_history r
    group by r.keyword, r.store, r.country
  )
  select t.term, t.store, t.country
  from tracked t
  left join volume_last vl
    on vl.term = t.term and vl.store = t.store and vl.country = t.country
  left join rank_last rl
    on rl.term = t.term and rl.store = t.store and rl.country = t.country
  left join public.keyword_refresh_failures kf
    on kf.term = t.term and kf.store = t.store and kf.country = t.country
  where (
      vl.last_volume is null
      or vl.last_volume < date_trunc('month', current_date)::date
      or rl.last_rank is null
      or rl.last_rank < current_date - interval '7 days'
    )
    and (
      kf.last_failed_on is null
      or kf.last_failed_on < now() - (least(kf.attempts, 6) * interval '2 hours')
    )
  order by least(coalesce(vl.last_volume, date '1970-01-01'), coalesce(rl.last_rank, date '1970-01-01')) asc
  limit p_limit;
$$;

grant execute on function public.stale_keywords_for_refresh(int) to service_role;
