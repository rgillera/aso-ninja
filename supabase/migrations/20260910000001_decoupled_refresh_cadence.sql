-- stale_keywords_today tried to give every tracked keyword a fresh Volume +
-- Rank check every single calendar day. At the platform's current keyword
-- count that's more sequential Apple/Play requests (each with real network
-- + DB latency on top of the rate limiter's own pacing gap) than a single
-- 300s cron invocation can get through, so the function was routinely
-- hitting Vercel's hard timeout and getting killed mid-run — with no
-- response ever returned, so this had zero visibility.
--
-- Volume is a slow-moving derived score (log-scaled rating counts) and the
-- Export Report only ever displays one bucket per calendar month anyway
-- (see performance-report/route.ts), so checking it more than once a month
-- buys nothing. Rank is the volatile one (day-to-day placement swings,
-- feeds the "Change" column and the significant-rank-change push
-- notification) but even that doesn't need daily — weekly still gives every
-- plan tier, including Free/Basic's 30-day retention window, several real
-- points to show a trend.
--
-- Splitting the two cadences (and reusing whichever real search result each
-- refresh performs to satisfy both, when both happen to be due at once)
-- cuts the *actual* daily volume of Apple/Play requests needed by roughly
-- 7x versus "everyone, every day" — small enough for frequent, small,
-- reliably-completing cron runs instead of one huge one that always times
-- out.
drop function if exists public.stale_keywords_today(date, int);

create or replace function public.stale_keywords_for_refresh(p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
set search_path = ''
as $$
  with volume_last as (
    select v.term, v.store, v.country, max(v.recorded_on) as last_volume
    from public.keyword_volume_history v
    group by v.term, v.store, v.country
  ),
  rank_last as (
    select r.keyword as term, r.store, r.country, max(r.recorded_on) as last_rank
    from public.keyword_rankings_history r
    group by r.keyword, r.store, r.country
  )
  select vl.term, vl.store, vl.country
  from volume_last vl
  left join rank_last rl
    on rl.term = vl.term and rl.store = vl.store and rl.country = vl.country
  where vl.last_volume < date_trunc('month', current_date)::date
     or rl.last_rank is null
     or rl.last_rank < current_date - interval '7 days'
  -- Fairness, same idea as the old ORDER BY: whichever combo has gone
  -- longest untouched by *either* check goes first. A combo that's never
  -- had a rank row at all (rl.last_rank null) sorts as if it were checked
  -- at the epoch, so it always wins ties against merely-stale ones.
  order by least(vl.last_volume, coalesce(rl.last_rank, date '1970-01-01')) asc
  limit p_limit;
$$;

grant execute on function public.stale_keywords_for_refresh(int) to service_role;
