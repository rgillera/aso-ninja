-- keyword_visibility_history timed out again (authenticated role's 8s
-- statement timeout) for an app tracking 842 keywords, so the Search
-- Visibility chart showed "No visibility data yet". At that size the
-- 20261028000001 version takes ~9s locally:
--  * rows read every ranked app's row for every term (2.7M), only to tell
--    which days were full searches and which days have any check;
--  * latest joined every check to every chart date within 30 days (3.1M
--    rows) before keeping the max per (app, term, date);
--  * contrib joined back to own_rows for positions (a 6M-row merge).
--
-- Now:
--  * full checks and chart dates are index probes per (term, day) and per
--    day, reading at most 2 rows each, instead of scanning every app's rows;
--  * each check carries its position and is valid from its day until the
--    next check (at most 30 days, as before), so it joins straight to the
--    chart dates it covers;
--  * the volume factor (numeric power) is computed once per (term, date),
--    not once per (app, term, date).
-- Same result as 20261028000001.
create or replace function public.keyword_visibility_history(
  p_terms text[], p_store text, p_country text, p_app_ids text[], p_from date, p_to date
)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
begin
  return (
  with scale as (
    select case when p_store = 'android' then date '2026-10-13' else date '2026-10-12' end as since
  ),
  apps as (select distinct unnest(p_app_ids) as app_id),
  terms as (select distinct unnest(p_terms) as keyword),
  -- Chart dates: every day in range with any ranking row for these terms.
  dates as materialized (
    select d::date as d
    from generate_series(p_from, p_to, interval '1 day') d
    where exists (
      select 1 from public.keyword_rankings_history r
      where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
        and r.recorded_on = d::date
    )
  ),
  -- The charted apps' own rows, reaching 30 days before p_from so the first
  -- chart dates can carry earlier checks forward.
  own_rows as materialized (
    select r.keyword, r.recorded_on, r.app_id, r.position
    from public.keyword_rankings_history r
    where r.app_id = any(p_app_ids) and r.store = p_store and r.country = p_country
      and r.keyword = any(p_terms)
      and r.recorded_on between p_from - 30 and p_to
  ),
  -- Full result sets only: one app's own row (iPad search, not-found marker)
  -- isn't a check of where everyone else ranks. Two ranked rows that day
  -- make it a full check; the probe stops at two.
  full_checks as materialized (
    select t.keyword, d::date as recorded_on
    from terms t
    cross join generate_series(p_from - 30, p_to, interval '1 day') d
    where (
      select count(*) from (
        select 1 from public.keyword_rankings_history r
        where r.keyword = t.keyword and r.store = p_store and r.country = p_country
          and r.recorded_on = d::date and r.position is not null
        limit 2
      ) two
    ) = 2
  ),
  -- Per app, every day a term counts as checked for it (a full check, or a
  -- row for the app itself) with the app's position that day, null when it
  -- wasn't ranked.
  checks as (
    select app_id, keyword, recorded_on, max(position) as position
    from (
      select a.app_id, f.keyword, f.recorded_on, null::int as position
      from full_checks f cross join apps a
      union all
      select app_id, keyword, recorded_on, position from own_rows
    ) c
    group by 1, 2, 3
  ),
  -- A check stands for every day from its own until the next check of the
  -- same (app, term), and for at most 30 days: the same "most recent check
  -- within 30 days" as before.
  spans as (
    select app_id, keyword, position, recorded_on as valid_from,
           least(
             coalesce(lead(recorded_on) over w - 1, p_to),
             recorded_on + 30
           ) as valid_to
    from checks
    window w as (partition by app_id, keyword order by recorded_on)
  ),
  latest as materialized (
    select dt.d, s.app_id, s.keyword, s.position
    from spans s
    join dates dt on dt.d between s.valid_from and s.valid_to
  ),
  -- popularity_at once per (term, date), not once per app row. Only volume
  -- on the current scale counts (see 20261027000006); dates before the
  -- switch use each term's first value after it.
  pop_score as (
    select k.keyword, k.d,
           coalesce((
             select v.score from public.keyword_volume_history v, scale
             where v.term = k.keyword and v.store = p_store and v.country = p_country
               and v.recorded_on between scale.since and k.d
             order by v.recorded_on desc
             limit 1
           ), (
             select v.score from public.keyword_volume_history v, scale
             where v.term = k.keyword and v.store = p_store and v.country = p_country
               and v.recorded_on >= scale.since
             order by v.recorded_on
             limit 1
           ), 0) as score
    from (select distinct keyword, d from latest) k
  ),
  -- The volume factor once per (term, date) too: numeric power() is the
  -- costly part of the sum, and it doesn't depend on the app.
  pop as materialized (
    select keyword, d, power(10, greatest(0, least(score, 100)) / 20.0) as reach
    from pop_score
  ),
  contrib as materialized (
    select l.app_id, l.d,
           sum(
             p.reach
             * case
                 when l.position between 1 and 10
                   then (array[1, 0.85, 0.7, 0.55, 0.45, 0.38, 0.32, 0.27, 0.23, 0.2])[l.position]
                 when l.position > 10 then 0.2 * 10 / l.position
                 else 0
               end
           ) as impressions
    from latest l
    join pop p on p.keyword = l.keyword and p.d = l.d
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
  from apps a
  );
end;
$$;
