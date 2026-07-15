-- stale_keywords_today had no ORDER BY, so at high keyword counts (where
-- total stale rows exceed p_limit) Postgres could return the same subset
-- run after run with no guarantee the rest ever gets picked up. Order by
-- how long it's been since each keyword was last recorded (oldest first)
-- so every keyword is guaranteed a turn within a bounded number of runs,
-- same fairness fix as stale_metadata_apps.
create or replace function stale_keywords_today(p_today date, p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
as $$
  select kps.term, kps.store, kps.country
  from keyword_volume_history kps
  where not exists (
    select 1 from keyword_volume_history kps2
    where kps2.term    = kps.term
      and kps2.store   = kps.store
      and kps2.country = kps.country
      and kps2.recorded_on = p_today
  )
  group by kps.term, kps.store, kps.country
  order by max(kps.recorded_on) asc nulls first
  limit p_limit;
$$;
