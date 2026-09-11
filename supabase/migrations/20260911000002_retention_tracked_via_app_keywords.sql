-- cleanup_expired_rankings and cleanup_expired_volume both decide "is this
-- term still actively tracked" by joining keywords -> keyword_metrics ->
-- apps. keyword_metrics only gets a row once metrics are actually computed
-- and saved (app/api/keywords/save's `if (metrics)` block) — a keyword
-- reserved without metrics (e.g. the onboarding wizard's saveTerms, by
-- design — see its own comment) has no keyword_metrics row until the
-- Research/Performance page backfill runs. Until then these two functions
-- see it as untracked, so if that backfill is slow or never happens, its
-- history rows (once any exist) age out at the Free plan's window instead
-- of honoring the plan it's actually entitled to — the same
-- app_keywords-vs-keyword_metrics blind spot fixed on the read side in
-- 20260911000001_stale_keywords_include_never_checked.sql, here on the
-- delete side. app_keywords is the actual source of truth for "is this
-- app tracking this keyword", set the moment it's reserved, so both
-- functions now join through it instead.
create or replace function public.cleanup_expired_rankings()
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

  with retention as (
    select k.term, a.store::text as store, lower(a.country) as country,
           bool_or(pl.history_retention_days is null) as unlimited,
           max(pl.history_retention_days) as max_days
    from public.keywords k
    join public.app_keywords ak on ak.keyword_id = k.id
    join public.apps a on a.id = ak.app_id
    cross join lateral public.get_workspace_plan(a.workspace_id) as pl
    where k.status = 'active'
    group by k.term, a.store::text, lower(a.country)
  )
  delete from public.keyword_rankings_history r
  using retention ret
  where r.keyword = ret.term and r.store = ret.store and r.country = ret.country
    and not ret.unlimited
    and r.recorded_on < current_date - (ret.max_days || ' days')::interval;
  get diagnostics deleted_tracked = row_count;

  delete from public.keyword_rankings_history r
  where r.recorded_on < current_date - (free_days || ' days')::interval
    and not exists (
      select 1 from public.keywords k
      join public.app_keywords ak on ak.keyword_id = k.id
      join public.apps a on a.id = ak.app_id
      where k.status = 'active' and k.term = r.keyword
        and a.store::text = r.store and lower(a.country) = r.country
    );
  get diagnostics deleted_untracked = row_count;

  return deleted_tracked + deleted_untracked;
end;
$$;

grant execute on function public.cleanup_expired_rankings() to service_role;

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

  with retention as (
    select k.term, a.store::text as store, lower(a.country) as country,
           bool_or(pl.history_retention_days is null) as unlimited,
           max(pl.history_retention_days) as max_days
    from public.keywords k
    join public.app_keywords ak on ak.keyword_id = k.id
    join public.apps a on a.id = ak.app_id
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

  delete from public.keyword_volume_history v
  where v.recorded_on < current_date - (free_days || ' days')::interval
    and not exists (
      select 1 from public.keywords k
      join public.app_keywords ak on ak.keyword_id = k.id
      join public.apps a on a.id = ak.app_id
      where k.status = 'active' and k.term = v.term
        and a.store::text = v.store and lower(a.country) = v.country
    );
  get diagnostics deleted_untracked = row_count;

  return deleted_tracked + deleted_untracked;
end;
$$;

grant execute on function public.cleanup_expired_volume() to service_role;
