-- stale_keywords_for_refresh (20260910000001_decoupled_refresh_cadence.sql)
-- selects FROM keyword_volume_history's own per-term/store/country max —
-- which means a term with *zero* rows there yet (added via a path that
-- reserves the keyword without computing metrics, e.g. the onboarding
-- wizard's saveTerms — see its own comment: "the real Keywords Research
-- page backfills those for anything it loads without a cache") never
-- appears in the candidate set at all, regardless of how stale it is. The
-- intended fallback ("Research/Performance page backfills it on next
-- visit") only fires if the user actually opens one of those pages before
-- checking the Export Report — if they don't (or an export races the
-- backfill), the keyword is invisible to this function forever and the
-- refresh cron can never rescue it, unlike a merely-stale keyword.
--
-- Driving the query from the real tracked set (keywords/app_keywords/apps,
-- mirroring cleanup_expired_volume's a.store::text / lower(a.country)
-- normalization) instead of from existing history rows means a
-- never-checked keyword now surfaces on the very next cron run, same as any
-- other stale one — the null coalesced to epoch already made that the
-- "wins every tie" case, this just lets it reach that comparison at all.
create or replace function public.stale_keywords_for_refresh(p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
set search_path = ''
as $$
  with tracked as (
    select distinct k.term, a.store::text as store, lower(a.country) as country
    from public.keywords k
    join public.app_keywords ak on ak.keyword_id = k.id
    join public.apps a on a.id = ak.app_id
    where k.status = 'active'
  ),
  volume_last as (
    select v.term, v.store, v.country, max(v.recorded_on) as last_volume
    from public.keyword_volume_history v
    group by v.term, v.store, v.country
  ),
  rank_last as (
    select r.keyword as term, r.store, r.country, max(r.recorded_on) as last_rank
    from public.keyword_rankings_history r
    group by r.keyword, r.store, r.country
  )
  select t.term, t.store, t.country
  from tracked t
  left join volume_last vl
    on vl.term = t.term and vl.store = t.store and vl.country = t.country
  left join rank_last rl
    on rl.term = t.term and rl.store = t.store and rl.country = t.country
  where vl.last_volume is null
     or vl.last_volume < date_trunc('month', current_date)::date
     or rl.last_rank is null
     or rl.last_rank < current_date - interval '7 days'
  -- Same fairness idea as before: whichever combo has gone longest untouched
  -- by *either* check goes first, and a combo with no row at all (volume or
  -- rank) sorts as if checked at the epoch, so it always wins ties against
  -- merely-stale ones.
  order by least(coalesce(vl.last_volume, date '1970-01-01'), coalesce(rl.last_rank, date '1970-01-01')) asc
  limit p_limit;
$$;

grant execute on function public.stale_keywords_for_refresh(int) to service_role;
