-- Visibility Score fixes on top of 20261007000002:
--
-- 1. "No visibility data yet" for apps whose tracked keywords were checked
--    but that didn't rank for any of them. Rank rows are only written for
--    apps that appear in the search results (no null-position row for an app
--    that's missing), and chart dates came only from rank rows for
--    p_app_ids, so a small app plus competitors that also didn't rank got no
--    dates at all. Chart dates are now every day any tracked term was checked
--    (a rank row for any app).
--
-- 2. Scores dropping to 0 on days only some keywords were checked. A day's
--    score used only that day's checks, so one Live Search on a keyword the
--    app doesn't rank for made a chart point worth 0 even if its other ranks
--    hadn't changed. Now each date uses every tracked term's most recent
--    check within the last 7 days (the date included). If the app isn't in
--    that check's results it counts as unranked, so a real drop out of the
--    rankings still shows; a term not checked in 7 days counts as unranked
--    too, so old ranks don't prop the score up forever.
--
-- Per (app, date) score is unchanged otherwise:
--   sum over terms of popularity_at(term, date) * weight(position), rounded
--   popularity_at = latest volume score recorded on or before that date (0 if none)
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
  with checks as materialized (
    -- Every (term, day) a tracked term was checked, reaching 6 days before
    -- p_from so the first chart dates can carry earlier checks forward.
    select distinct r.keyword, r.recorded_on
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.recorded_on between p_from - 6 and p_to
  ),
  dates as (
    select distinct recorded_on as d from checks where recorded_on between p_from and p_to
  ),
  -- Each term's most recent check as of each chart date, within 7 days.
  latest as materialized (
    select dt.d, c.keyword, max(c.recorded_on) as checked_on
    from dates dt
    join checks c on c.recorded_on between dt.d - 6 and dt.d
    group by 1, 2
  ),
  ranked as (
    select l.d, l.keyword, r.app_id, r.position
    from latest l
    join public.keyword_rankings_history r
      on r.keyword = l.keyword and r.recorded_on = l.checked_on
     and r.store = p_store and r.country = p_country
    where r.app_id = any(p_app_ids) and r.position between 1 and 200
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
    from (select distinct keyword, d from ranked) k
  ),
  -- materialized: referenced only once (inside the per-app subquery below),
  -- so Postgres would otherwise inline it and recompute it once per chart
  -- date (measured: ~7s for 100 terms x 90 days, past anon's 3s
  -- statement_timeout).
  contrib as materialized (
    select w.app_id, w.d,
           sum(p.score * (1 - (w.position - 1) / 200.0)) as s
    from ranked w
    join pop p on p.keyword = w.keyword and p.d = w.d
    group by 1, 2
  )
  select coalesce(jsonb_object_agg(a.app_id, coalesce((
    select jsonb_agg(jsonb_build_object('date', dt.d, 'score', round(coalesce(c.s, 0))::int) order by dt.d)
    from dates dt
    left join contrib c on c.app_id = a.app_id and c.d = dt.d
  ), '[]'::jsonb)), '{}'::jsonb)
  from (select distinct unnest(p_app_ids) as app_id) a;
$$;
