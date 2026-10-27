-- Visibility Score to one decimal instead of a whole number.
--
-- Most apps rank for a small share of their tracked keywords, so real scores
-- sit in the low single digits, where rounding to an integer hid every move
-- (3.6 and 4.4 both showed as 4, and the chart read as flat). Same function
-- as 20261027000003; only the final rounding changes.
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
      'score', coalesce(round(100 * c.earned / nullif(c.possible, 0), 1), 0)
    ) order by dt.d)
    from dates dt
    left join contrib c on c.app_id = a.app_id and c.d = dt.d
  ), '[]'::jsonb)), '{}'::jsonb)
  from (select distinct unnest(p_app_ids) as app_id) a;
$$;
