-- A term's history snapshot can be fresh while an app's keyword_metrics row
-- for it is not: the client-side live search (and the Inspector's) writes
-- today's keyword_rankings_history without touching any keyword_metrics row,
-- and that alone kept the term out of this list, so the table could show a
-- difficulty and rank weeks older than the Inspector's.
--
-- Same function as 20261026000005_stale_keywords_lateral_lookup.sql, plus:
-- a term is also stale when any active app's metrics row for it hasn't been
-- updated in 7 days, and that row's age counts toward the ordering.
create or replace function public.stale_keywords_for_refresh(p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
set search_path = ''
as $$
  with tracked as (
    select k.term, a.store::text as store, lower(a.country) as country,
           min(km.updated_at)::date as oldest_row
    from public.keywords k
    join public.app_keywords ak on ak.keyword_id = k.id
    join public.apps a on a.id = ak.app_id
    -- Only rows the cron's refreshKeywordMetrics actually rewrites (active
    -- app, link not frozen), or a row it skips would keep its term stale on
    -- every run.
    left join public.keyword_metrics km
      on km.app_id = ak.app_id and km.keyword_id = ak.keyword_id
     and a.status = 'active' and ak.status is distinct from 'frozen'
    where k.status = 'active'
    group by k.term, a.store, lower(a.country)
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
      or t.oldest_row < current_date - interval '7 days'
    )
    and (
      kf.last_failed_on is null
      or kf.last_failed_on < now() - (least(kf.attempts, 6) * interval '2 hours')
    )
  order by least(
    coalesce(vl.last_volume, date '1970-01-01'),
    coalesce(rl.last_rank, date '1970-01-01'),
    coalesce(t.oldest_row, date '9999-12-31')
  ) asc
  limit p_limit;
$$;

grant execute on function public.stale_keywords_for_refresh(int) to service_role;

-- Looking up every app's row for one term (the cron's refreshKeywordMetrics,
-- and syncTrackedRows in libs/keyword-core-metrics.ts on every live check)
-- filters keywords by term across workspaces and joins keyword_metrics on
-- keyword_id; neither had an index leading with that column.
create index if not exists keywords_term_idx on public.keywords (term);
create index if not exists keyword_metrics_keyword_id_idx on public.keyword_metrics (keyword_id);
