-- Visibility Score still dropped to 0 on some days after
-- 20261027000001. keyword_rankings_history is shared across workspaces, and
-- some writes are a single app's row rather than a full result set: iPad
-- searches (persistIpadRank, the search route's ipadOnly path) and "checked,
-- not found" markers. 20261027000001 counted any row as a check of the term,
-- so one of those made every other app look unranked for that term that day.
-- Now a term's check is either a full one (2+ ranked apps in it, where an
-- absent app really is unranked) or a row for that app itself (how iPad-only
-- apps get their ranks); each app uses the latest of those within 7 days.
-- Everything else matches 20261027000001.
create or replace function public.keyword_visibility_history(
  p_terms text[], p_store text, p_country text, p_app_ids text[], p_from date, p_to date
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with rows as materialized (
    -- Reaches 6 days before p_from so the first chart dates can carry
    -- earlier checks forward.
    select r.keyword, r.recorded_on, r.app_id, r.position
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.recorded_on between p_from - 6 and p_to
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
  -- Each (app, term)'s most recent check as of each chart date, within 7 days.
  latest as materialized (
    select dt.d, c.app_id, c.keyword, max(c.recorded_on) as checked_on
    from dates dt
    join app_checks c on c.recorded_on between dt.d - 6 and dt.d
    group by 1, 2, 3
  ),
  ranked as (
    select l.d, l.keyword, l.app_id, r.position
    from latest l
    join rows r on r.keyword = l.keyword and r.recorded_on = l.checked_on and r.app_id = l.app_id
    where r.position between 1 and 200
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
