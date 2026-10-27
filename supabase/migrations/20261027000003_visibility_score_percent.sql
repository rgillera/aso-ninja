-- Visibility Score as a 0 to 100 percentage, and no 7-day cutoff.
--
-- The score was a sum over tracked keywords, so it moved with how many
-- keywords happened to have a recent check rather than with how well the
-- app ranks: a big refresh (or adding keywords, which Live Searches all of
-- them) looked like a spike, and sparse days looked like a crash. The 7-day
-- cutoff from 20261027000001 made that worse: keywords not re-checked within
-- a week counted as unranked, dropping whole stretches to 0.
--
-- Now, per (app, date):
--   score = 100 * sum(popularity * weight) / sum(popularity)
-- over the tracked keywords that have a check for that app in the 30 days up
-- to that date (each keyword's most recent one), i.e. the share of the best
-- possible score (every one of those keywords at #1). Keywords never checked
-- in that window are left out of both sides instead of counting as 0.
--   popularity = latest volume score recorded on or before that date
--   weight = 1 - (rank - 1) / 200 for ranks 1..200, 0 if not ranked
-- What counts as a check is unchanged from 20261027000002: a full result
-- set (2+ ranked apps) or a row for that app itself.
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
           sum(p.score * case when r.position between 1 and 200 then 1 - (r.position - 1) / 200.0 else 0 end) as earned,
           sum(p.score) as possible
    from latest l
    join pop p on p.keyword = l.keyword and p.d = l.d
    left join rows r on r.keyword = l.keyword and r.recorded_on = l.checked_on and r.app_id = l.app_id
    group by 1, 2
  )
  select coalesce(jsonb_object_agg(a.app_id, coalesce((
    select jsonb_agg(jsonb_build_object(
      'date', dt.d,
      'score', coalesce(round(100 * c.earned / nullif(c.possible, 0)), 0)::int
    ) order by dt.d)
    from dates dt
    left join contrib c on c.app_id = a.app_id and c.d = dt.d
  ), '[]'::jsonb)), '{}'::jsonb)
  from (select distinct unnest(p_app_ids) as app_id) a;
$$;
