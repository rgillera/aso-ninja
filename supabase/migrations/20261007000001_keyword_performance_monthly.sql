-- Monthly volume/rank roll-up for Keyword Performance's Export Report
-- (app/api/keywords/performance-report/route.ts).
--
-- That route used to pull every raw keyword_volume_history and
-- keyword_rankings_history row for the app's tracked terms and roll them up
-- in JS. PostgREST caps any unranged select at max_rows (1000), and a
-- 250-term batch easily carries far more than that (daily volume readings
-- from before the monthly refresh schedule, weekly ranks, up to a year of
-- plan-aware retention), so the response was silently cut off at an
-- arbitrary 1000 rows: whole months, often the newest, went missing from
-- the export and inflated its "still catching up" count.
--
-- Rolling up here returns at most one entry per term per month, as a single
-- jsonb value, so no row cap applies however many terms are tracked.
-- Semantics match the old JS roll-up exactly:
--   avgVolume: rounded mean of that month's volume scores
--   bestRank:  smallest non-null position for p_app_id that month; a month
--              with only null ("checked, not found") rank rows gets no rank
--              entry, same as before
-- security invoker, so the caller's RLS still applies (both tables are
-- publicly readable today).
create or replace function public.keyword_performance_monthly(
  p_terms text[], p_store text, p_country text, p_app_id text
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with vol as (
    select v.term, to_char(v.recorded_on, 'YYYY-MM') as month, round(avg(v.score))::int as avg_volume
    from public.keyword_volume_history v
    where v.term = any(p_terms) and v.store = p_store and v.country = p_country
    group by 1, 2
  ),
  rnk as (
    select r.keyword as term, to_char(r.recorded_on, 'YYYY-MM') as month, min(r.position) as best_rank
    from public.keyword_rankings_history r
    where coalesce(p_app_id, '') <> ''
      and r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.app_id = p_app_id and r.position is not null
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'term', coalesce(v.term, r.term),
    'month', coalesce(v.month, r.month),
    'avgVolume', v.avg_volume,
    'bestRank', r.best_rank
  )), '[]'::jsonb)
  from vol v
  full join rnk r on r.term = v.term and r.month = v.month;
$$;

grant execute on function public.keyword_performance_monthly(text[], text, text, text) to anon, authenticated, service_role;
