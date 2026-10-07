-- Server-side roll-up for the All Ranked Keywords page
-- (app/api/keywords/ranked/route.ts), same reason as
-- 20261007000001_keyword_performance_monthly: the route pulled every
-- non-null rank row for the app (every keyword x every date) ordered by
-- keyword, and PostgREST truncates at max_rows (1000) no matter what
-- .limit() asks for, so keywords late in the alphabet vanished from the
-- table and the "ranked keywords over time" chart undercounted. Returns one
-- jsonb value, so no row cap applies.
--
-- Same output the route built in JS:
--   keywords: per keyword (alphabetical), the latest rank + date and the
--             one before it (prev null when there's only one), plus the
--             term's latest volume score
--   history:  per date (ascending), how many distinct keywords the app
--             ranked for that day
-- security invoker, so the caller's RLS still applies.
create or replace function public.keyword_ranked_summary(
  p_app_id text, p_store text, p_country text
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with r as materialized (
    select k.keyword, k.recorded_on, k.position,
           row_number() over (partition by k.keyword order by k.recorded_on desc) as rn
    from public.keyword_rankings_history k
    where k.app_id = p_app_id and k.store = p_store and k.country = p_country
      and k.position is not null
  ),
  kw as (
    select l.keyword, l.position as rank, l.recorded_on as rank_date,
           p.position as prev_rank, p.recorded_on as prev_date
    from r l
    left join r p on p.keyword = l.keyword and p.rn = 2
    where l.rn = 1
  ),
  vol as (
    select distinct on (v.term) v.term, v.score
    from public.keyword_volume_history v
    join kw on kw.keyword = v.term
    where v.store = p_store and v.country = p_country
    order by v.term, v.recorded_on desc
  )
  select jsonb_build_object(
    'keywords', coalesce((
      select jsonb_agg(jsonb_build_object(
        'term', kw.keyword, 'volume', vol.score,
        'rank', kw.rank, 'rankDate', kw.rank_date,
        'prevRank', kw.prev_rank, 'prevDate', kw.prev_date
      ) order by kw.keyword)
      from kw left join vol on vol.term = kw.keyword
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d)
      from (select recorded_on as d, count(distinct keyword)::int as c from r group by 1) h
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.keyword_ranked_summary(text, text, text) to anon, authenticated, service_role;
