-- keyword_performance_snapshots: find each term's two latest rank dates by
-- walking that term's dates newest-first and stopping at the second one with
-- a row for any of p_app_ids, instead of reading every ranked app's row for
-- every term across all of history and ranking them all.
--
-- With 842 tracked terms the old body read every index entry for those
-- terms (every app in every search ever recorded), which grows with history
-- and with how many apps a search returns, and is the same request the
-- Keyword Performance table waits on.
--
-- plpgsql with force_custom_plan so each call is planned with the real
-- arrays (see 20261028000001). Same result as 20261007000002.
create or replace function public.keyword_performance_snapshots(
  p_terms text[], p_store text, p_country text, p_app_ids text[]
)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
begin
  return (
  with vol as (
    select v.term, v.recorded_on, v.score,
           dense_rank() over (partition by v.term order by v.recorded_on desc) as rk,
           max(v.score) over (partition by v.term) as max_score
    from public.keyword_volume_history v
    where v.term = any(p_terms) and v.store = p_store and v.country = p_country
  ),
  -- Each term's two most recent dates with a row for any of p_app_ids.
  rank_dates as (
    select t.keyword, d.recorded_on
    from (select distinct unnest(p_terms) as keyword) t
    cross join lateral (
      select distinct r.recorded_on
      from public.keyword_rankings_history r
      where r.keyword = t.keyword and r.store = p_store and r.country = p_country
        and r.app_id = any(p_app_ids)
      order by r.recorded_on desc
      limit 2
    ) d
  ),
  rnk as (
    select r.keyword, r.recorded_on, r.app_id, r.position
    from rank_dates rd
    join public.keyword_rankings_history r
      on r.keyword = rd.keyword and r.store = p_store and r.country = p_country
     and r.recorded_on = rd.recorded_on and r.app_id = any(p_app_ids)
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
      from rnk
    ), '[]'::jsonb)
  )
  );
end;
$$;
