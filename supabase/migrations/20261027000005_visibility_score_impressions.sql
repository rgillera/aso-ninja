-- Visibility Score as estimated search impressions per day, replacing the
-- 0 to 100 percentage from 20261027000003 (rounded to one
-- decimal in 20261027000004).
--
-- The percentage was the share of the best possible score over the tracked
-- keywords, so it sat in the low single digits for most apps (they rank for
-- few of what they track), barely moved on a 0-100 axis, and dropped whenever
-- a keyword the app doesn't rank for yet was added. Impressions are a real
-- number, rise with rank and with volume, and an unranked keyword adds 0.
--
-- Now, per (app, date), over the tracked keywords that have a check for that
-- app in the 30 days up to that date (each keyword's most recent one):
--   score = sum(daily_searches * view_rate)
--   daily_searches = 10 ^ (popularity / 20), popularity clamped to 0..100
--   view_rate = 1, .85, .7, .55, .45, .38, .32, .27, .23, .2 for ranks 1..10,
--               0.2 * 10 / rank past that, 0 if not ranked
-- Same model as estimateDailySearches / viewRateForRank in
-- libs/keyword-impressions.ts, so it lines up with the keyword table's
-- "Est. impressions" figures. Keep the two in sync.
-- Returns { "<app_id>": [{ date, score }, ...] } with every app in
-- p_app_ids present (0 on dates with nothing to score).
create or replace function public.keyword_visibility_history(
  p_terms text[], p_store text, p_country text, p_app_ids text[], p_from date, p_to date
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with rows as materialized (
    -- Reaches 30 days before p_from so the first chart dates can carry
    -- earlier checks forward.
    select r.keyword, r.recorded_on, r.app_id, r.position
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.recorded_on between p_from - 30 and p_to
  ),
  -- Full result sets only: one app's own row (iPad search, not-found
  -- marker) isn't a check of where everyone else ranks.
  full_checks as (
    select keyword, recorded_on
    from rows
    group by 1, 2
    having count(*) filter (where position is not null) >= 2
  ),
  -- Per app, every day a term counts as checked for it: a full check, or a
  -- row for the app itself.
  app_checks as (
    select a.app_id, f.keyword, f.recorded_on
    from full_checks f
    cross join (select distinct unnest(p_app_ids) as app_id) a
    union
    select app_id, keyword, recorded_on from rows where app_id = any(p_app_ids)
  ),
  dates as (
    select distinct recorded_on as d from rows where recorded_on between p_from and p_to
  ),
  -- Each (app, term)'s most recent check as of each chart date.
  latest as materialized (
    select dt.d, c.app_id, c.keyword, max(c.recorded_on) as checked_on
    from dates dt
    join app_checks c on c.recorded_on between dt.d - 30 and dt.d
    group by 1, 2, 3
  ),
  -- popularity_at once per (term, date), not once per app row.
  pop as materialized (
    select k.keyword, k.d,
           coalesce((
             select v.score from public.keyword_volume_history v
             where v.term = k.keyword and v.store = p_store and v.country = p_country
               and v.recorded_on <= k.d
             order by v.recorded_on desc
             limit 1
           ), 0) as score
    from (select distinct keyword, d from latest) k
  ),
  -- materialized: referenced only once (inside the per-app subquery below),
  -- so Postgres would otherwise inline it and recompute it once per chart
  -- date.
  contrib as materialized (
    select l.app_id, l.d,
           sum(
             power(10, greatest(0, least(p.score, 100)) / 20.0)
             * case
                 when r.position between 1 and 10
                   then (array[1, 0.85, 0.7, 0.55, 0.45, 0.38, 0.32, 0.27, 0.23, 0.2])[r.position]
                 when r.position > 10 then 0.2 * 10 / r.position
                 else 0
               end
           ) as impressions
    from latest l
    join pop p on p.keyword = l.keyword and p.d = l.d
    left join rows r on r.keyword = l.keyword and r.recorded_on = l.checked_on and r.app_id = l.app_id
    group by 1, 2
  )
  select coalesce(jsonb_object_agg(a.app_id, coalesce((
    select jsonb_agg(jsonb_build_object(
      'date', dt.d,
      'score', coalesce(round(c.impressions), 0)::bigint
    ) order by dt.d)
    from dates dt
    left join contrib c on c.app_id = a.app_id and c.d = dt.d
  ), '[]'::jsonb)), '{}'::jsonb)
  from (select distinct unnest(p_app_ids) as app_id) a;
$$;
