-- Visibility Score showed "No visibility data yet" for apps whose tracked
-- keywords were checked but that didn't rank for any of them. Rank rows are
-- only written for apps that appear in the search results (no null-position
-- row for an app that's missing), and chart dates came only from rank rows for
-- p_app_ids. So a small app, plus competitors that also didn't rank, got no
-- dates at all. Now the chart dates are every day any tracked term was checked
-- (a rank row for any app). Apps not ranked that day score 0, which is their
-- real visibility. Everything else matches 20261007000002.
create or replace function public.keyword_visibility_history(
  p_terms text[], p_store text, p_country text, p_app_ids text[], p_from date, p_to date
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with win as (
    select r.keyword, r.recorded_on, r.app_id, r.position
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.app_id = any(p_app_ids)
      and r.recorded_on between p_from and p_to
  ),
  dates as (
    select distinct r.recorded_on as d
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.recorded_on between p_from and p_to
  ),
  -- popularity_at once per (term, date), not once per app row: every app
  -- ranked for a term on a day shares the same volume lookup.
  pop as materialized (
    select k.keyword, k.d,
           coalesce((
             select v.score from public.keyword_volume_history v
             where v.term = k.keyword and v.store = p_store and v.country = p_country
               and v.recorded_on <= k.d
             order by v.recorded_on desc
             limit 1
           ), 0) as score
    from (select distinct keyword, recorded_on as d from win where position is not null) k
  ),
  -- materialized: referenced only once (inside the per-app subquery below),
  -- so Postgres would otherwise inline it and recompute it once per chart
  -- date (measured: ~7s for 100 terms x 90 days, past anon's 3s
  -- statement_timeout).
  contrib as materialized (
    select w.app_id, w.recorded_on as d,
           sum(p.score * case when w.position between 1 and 200 then 1 - (w.position - 1) / 200.0 else 0 end) as s
    from win w
    join pop p on p.keyword = w.keyword and p.d = w.recorded_on
    where w.position is not null
    group by 1, 2
  )
  select coalesce(jsonb_object_agg(a.app_id, coalesce((
    select jsonb_agg(jsonb_build_object('date', dt.d, 'score', round(coalesce(c.s, 0))::int) order by dt.d)
    from dates dt
    left join contrib c on c.app_id = a.app_id and c.d = dt.d
  ), '[]'::jsonb)), '{}'::jsonb)
  from (select distinct unnest(p_app_ids) as app_id) a;
$$;
