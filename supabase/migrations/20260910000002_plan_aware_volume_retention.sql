-- keyword_volume_history never had a retention policy — rows just
-- accumulated forever. Now that Volume is only checked once a month (see
-- 20260910000001_decoupled_refresh_cadence.sql) a year of history per
-- keyword is only ~12 rows, so this isn't an urgent storage problem, but it
-- should still be a deliberate choice tied to the same plan-aware windows
-- as everything else — keyword_rankings_history's retention
-- (20260909000002_plan_aware_rankings_retention.sql), the Export Report,
-- and both history panels — rather than "keep everything, forever" by
-- default.
--
-- keyword_volume_history has no app_id — it's one shared score per
-- (term, store, country) across the whole platform, not per tracking app —
-- so this mirrors cleanup_expired_rankings exactly: retain per the longest
-- window any workspace currently tracking that keyword is entitled to,
-- since any one of them may still need it.
create or replace function public.cleanup_expired_volume()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  deleted_tracked integer;
  deleted_untracked integer;
  free_days integer;
begin
  select history_retention_days into free_days from public.plans where slug = 'free';

  -- Actively tracked keywords.
  with retention as (
    select k.term, a.store::text as store, lower(a.country) as country,
           bool_or(pl.history_retention_days is null) as unlimited,
           max(pl.history_retention_days) as max_days
    from public.keywords k
    join public.keyword_metrics km on km.keyword_id = k.id
    join public.apps a on a.id = km.app_id
    cross join lateral public.get_workspace_plan(a.workspace_id) as pl
    where k.status = 'active'
    group by k.term, a.store::text, lower(a.country)
  )
  delete from public.keyword_volume_history v
  using retention ret
  where v.term = ret.term and v.store = ret.store and v.country = ret.country
    and not ret.unlimited
    and v.recorded_on < current_date - (ret.max_days || ' days')::interval;
  get diagnostics deleted_tracked = row_count;

  -- Keywords nobody actively tracks anymore age out at the Free plan's
  -- window, same fallback as cleanup_expired_rankings.
  delete from public.keyword_volume_history v
  where v.recorded_on < current_date - (free_days || ' days')::interval
    and not exists (
      select 1 from public.keywords k
      join public.keyword_metrics km on km.keyword_id = k.id
      join public.apps a on a.id = km.app_id
      where k.status = 'active' and k.term = v.term
        and a.store::text = v.store and lower(a.country) = v.country
    );
  get diagnostics deleted_untracked = row_count;

  return deleted_tracked + deleted_untracked;
end;
$$;

grant execute on function public.cleanup_expired_volume() to service_role;
