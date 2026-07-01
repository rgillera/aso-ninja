-- Recreate function to reference renamed table keyword_volume_history
create or replace function stale_keywords_today(p_today date, p_limit int default 200)
returns table(term text, store text, country text)
language sql security definer
as $$
  select distinct kps.term, kps.store, kps.country
  from keyword_volume_history kps
  where not exists (
    select 1 from keyword_volume_history kps2
    where kps2.term    = kps.term
      and kps2.store   = kps.store
      and kps2.country = kps.country
      and kps2.recorded_on = p_today
  )
  limit p_limit;
$$;
