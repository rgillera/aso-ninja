-- Per-day rank/volume observations for Keyword Performance's Est. Downloads
-- history chart (app/api/keywords/downloads-history/route.ts), which splits
-- each past day's real download total by that day's own volume + rank
-- instead of today's.
--
-- keyword_rankings_history only gets a row for the apps a search actually
-- returned, so "checked that day, our app wasn't in the results" can't be
-- read from our own app_id's rows alone: it's any row for the keyword that
-- day (some app was ranked) with none for p_app_id. Doing that through
-- PostgREST would mean pulling every app's rows for every tracked term,
-- far past max_rows (1000) — same problem 20261007000001_keyword_performance_monthly.sql
-- solved by returning a single jsonb value, which this follows.
--
-- One entry per term per day that has either a rank check or a volume
-- snapshot:
--   checked: a rank check ran for this term that day
--   rank:    p_app_id's best position that day; null when checked but not
--            found (or not checked at all, see `checked`)
--   volume:  that day's volume score, null when none was recorded
-- security invoker, so the caller's RLS still applies (both tables are
-- publicly readable today).
create or replace function public.keyword_daily_observations(
  p_terms text[], p_store text, p_country text, p_app_id text, p_since date
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with checks as (
    select r.keyword as term, r.recorded_on as day,
           min(r.position) filter (where r.app_id = p_app_id) as rank
    from public.keyword_rankings_history r
    where r.keyword = any(p_terms) and r.store = p_store and r.country = p_country
      and r.recorded_on >= p_since
    group by 1, 2
  ),
  vol as (
    select v.term, v.recorded_on as day, round(avg(v.score))::int as volume
    from public.keyword_volume_history v
    where v.term = any(p_terms) and v.store = p_store and v.country = p_country
      and v.recorded_on >= p_since
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'term', coalesce(c.term, v.term),
    'day', coalesce(c.day, v.day),
    'checked', c.term is not null,
    'rank', c.rank,
    'volume', v.volume
  ) order by coalesce(c.day, v.day)), '[]'::jsonb)
  from checks c
  full join vol v on v.term = c.term and v.day = c.day;
$$;

grant execute on function public.keyword_daily_observations(text[], text, text, text, date) to anon, authenticated, service_role;
