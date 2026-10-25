-- stale_keywords_for_refresh was hitting the statement timeout (57014) on
-- every refresh-keywords cron run (every 30 min, vercel.json), so the cron
-- 500'd before refreshing anything. The volume_last / rank_last CTEs grouped
-- the *entire* history tables to find each term's latest recorded_on —
-- keyword_rankings_history holds up to ~250 rows per keyword per day (one
-- per ranked app) times plan-aware retention, so that full scan only grows.
--
-- Same result, same ordering, same failure backoff as
-- 20260911000003_volume_refresh_failure_backoff.sql — but the latest date is
-- now looked up per tracked term via LATERAL ... order by recorded_on desc
-- limit 1, which the existing (term|keyword, store, country, recorded_on
-- desc) indexes on both history tables answer with a single index probe.
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
  )
  select t.term, t.store, t.country
  from tracked t
  left join lateral (
    select v.recorded_on as last_volume
    from public.keyword_volume_history v
    where v.term = t.term and v.store = t.store and v.country = t.country
    order by v.recorded_on desc
    limit 1
  ) vl on true
  left join lateral (
    select r.recorded_on as last_rank
    from public.keyword_rankings_history r
    where r.keyword = t.term and r.store = t.store and r.country = t.country
    order by r.recorded_on desc
    limit 1
  ) rl on true
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
