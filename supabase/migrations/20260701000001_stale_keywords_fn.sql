-- Returns distinct (term, store, country) combos that have historical
-- snapshots but no entry yet for today. Used by the daily cron job.
create or replace function stale_keywords_today(p_today date, p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
as $$
  select distinct kps.term, kps.store, kps.country
  from keyword_popularity_snapshots kps
  where not exists (
    select 1 from keyword_popularity_snapshots kps2
    where kps2.term    = kps.term
      and kps2.store   = kps.store
      and kps2.country = kps.country
      and kps2.recorded_on = p_today
  )
  limit p_limit;
$$;
