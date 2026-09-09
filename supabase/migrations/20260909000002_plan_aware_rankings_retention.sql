-- plans.ts already advertises different historical-data windows per tier
-- ("1 month" Free/Basic, "6 months" Pro, "1 year" Pro+/Enterprise) but
-- nothing enforced it — cleanup-history dropped everything at a single flat
-- cutoff for every workspace. This ties retention to the plan actually paid
-- for.
--
-- null is left available to mean "unlimited" (matching the existing
-- convention on this table's other *_limit columns), but no current plan
-- uses it — Enterprise is a flat 1 year same as Pro+, not unlimited.
alter table plans add column history_retention_days integer;

update plans set history_retention_days = 30  where slug = 'free';
update plans set history_retention_days = 30  where slug = 'basic';
update plans set history_retention_days = 180 where slug = 'pro';
update plans set history_retention_days = 365 where slug = 'pro_plus';
update plans set history_retention_days = 365 where slug = 'enterprise';

-- Deletes expired keyword_rankings_history rows, honoring each keyword's
-- retention window rather than one global cutoff. A single keyword can be
-- tracked by several workspaces on different plans (e.g. a Free and a Pro+
-- workspace both tracking "fitness tracker") — that keyword's history is
-- kept as long as the LONGEST window any of them is entitled to, since any
-- one of them may still need it.
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

  -- Actively tracked keywords: retain per the longest window any workspace
  -- tracking them is entitled to. unlimited = true (a null
  -- history_retention_days, i.e. Enterprise) exempts that keyword's history
  -- from deletion entirely.
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
  delete from public.keyword_rankings_history r
  using retention ret
  where r.keyword = ret.term and r.store = ret.store and r.country = ret.country
    and not ret.unlimited
    and r.recorded_on < current_date - (ret.max_days || ' days')::interval;
  get diagnostics deleted_tracked = row_count;

  -- Keywords nobody actively tracks anymore (removed from every workspace,
  -- or rows that only ever existed as Ranked Keywords' organic-discovery
  -- snapshots) have no plan to honor, so they age out at the Free plan's
  -- window instead of lingering forever.
  delete from public.keyword_rankings_history r
  where r.recorded_on < current_date - (free_days || ' days')::interval
    and not exists (
      select 1 from public.keywords k
      join public.keyword_metrics km on km.keyword_id = k.id
      join public.apps a on a.id = km.app_id
      where k.status = 'active' and k.term = r.keyword
        and a.store::text = r.store and lower(a.country) = r.country
    );
  get diagnostics deleted_untracked = row_count;

  return deleted_tracked + deleted_untracked;
end;
$$;

-- security definer means the function itself always runs with owner
-- privileges (bypassing RLS internally) — but the cron still calls it via
-- the service-role client, so this grant just lets that role invoke it at
-- all; nothing here is exposed to anon/public.
grant execute on function public.cleanup_expired_rankings() to service_role;
