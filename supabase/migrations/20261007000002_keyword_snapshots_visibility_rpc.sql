-- Server-side reductions for Keyword Performance's snapshot and Visibility
-- Score routes, same reason as 20261007000001_keyword_performance_monthly:
-- both routes used to pull every raw history row for the app's tracked terms
-- and PostgREST silently truncates any unranged select at max_rows (1000).
-- Both ordered by recorded_on ascending, so the rows that got cut were the
-- newest ones — exactly the "latest" volume/rank and the most recent chart
-- points. Each function returns a single jsonb value, so no row cap applies.
-- security invoker, so the caller's RLS still applies.

-- app/api/keywords/performance-snapshots: the route only ever reads each
-- term's two most recent volume dates (+ the term's max score) and its two
-- most recent rank dates (across p_app_ids, matching the route's own
-- rankDates), so only those rows come back. Rank rows keep null positions:
-- the route reads them as the "checked, not found" marker.
create or replace function public.keyword_performance_snapshots(
  p_terms text[], p_store text, p_country text, p_app_ids text[]
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with vol as (
    select v.term, v.recorded_on, v.score,
           dense_rank() over (partition by v.term order by v.recorded_on desc) as rk,
           max(v.score) over (partition by v.term) as max_score
    from public.keyword_volume_history v
    where v.term = any(p_terms) and v.store = p_store and v.country = p_country
  ),
  rnk as (
    select r.keyword, r.recorded_on, r.app_id, r.position,
           dense_rank() over (partition by r.keyword order by r.recorded_on desc) as rk
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.app_id = any(p_app_ids)
  )
  select jsonb_build_object(
    'volume', coalesce((
      select jsonb_agg(jsonb_build_object(
        'term', term, 'recorded_on', recorded_on, 'score', score, 'max_score', max_score
      ))
      from vol where rk <= 2
    ), '[]'::jsonb),
    'rank', coalesce((
      select jsonb_agg(jsonb_build_object(
        'keyword', keyword, 'recorded_on', recorded_on, 'app_id', app_id, 'position', position
      ))
      from rnk where rk <= 2
    ), '[]'::jsonb)
  );
$$;

-- app/api/keywords/visibility-history: computes the whole chart here.
-- Same math the route did in JS:
--   chart dates = every distinct recorded_on with a rank row for any of
--     p_app_ids in [p_from, p_to] (null-position rows included)
--   score(app, date) = sum over terms with a non-null position that day of
--     popularity_at(term, date) * weight(position), rounded
--   popularity_at = latest volume score recorded on or before that date
--     (0 if none)
--   weight = 1 - (rank - 1) / 200 for ranks 1..200, else 0
-- Returns { "<app_id>": [{ date, score }, ...] } with every app in
-- p_app_ids present (zeros on dates it isn't ranked).
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
  dates as (select distinct recorded_on as d from win),
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

grant execute on function public.keyword_performance_snapshots(text[], text, text, text[]) to anon, authenticated, service_role;
grant execute on function public.keyword_visibility_history(text[], text, text, text[], date, date) to anon, authenticated, service_role;
