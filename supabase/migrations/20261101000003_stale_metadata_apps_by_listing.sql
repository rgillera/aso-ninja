-- stale_metadata_apps still matched snapshots on app_id, but snapshots are
-- keyed by listing since 20260903000002 and app_id is only a breadcrumb that
-- each upsert overwrites. A listing followed by more than one apps row (two
-- workspaces, or the same app as a competitor elsewhere) so always had a row
-- that looked "missing today", got fetched again every run, and pushed other
-- apps out of the batch. Match and order by listing instead, one row each.
create or replace function stale_metadata_apps(p_today date, p_limit int default 200)
returns table(id uuid, workspace_id uuid, store text, bundle_id text, store_id text, country text)
language sql security definer set search_path = ''
as $$
  select s.id, s.workspace_id, s.store, s.bundle_id, s.store_id, s.country
  from (
    select distinct on (a.store, upper(coalesce(a.country, 'US')), a.store_id, a.bundle_id)
      a.id, a.workspace_id, a.store::text as store, a.bundle_id, a.store_id, a.country,
      (
        select max(ms2.recorded_on) from public.metadata_snapshots ms2
        where ms2.store = a.store and ms2.country = upper(coalesce(a.country, 'US'))
          and ms2.store_id = coalesce(a.store_id, '') and ms2.bundle_id = coalesce(a.bundle_id, '')
      ) as last_recorded
    from public.apps a
    where not exists (
      select 1 from public.metadata_snapshots ms
      where ms.store = a.store and ms.country = upper(coalesce(a.country, 'US'))
        and ms.store_id = coalesce(a.store_id, '') and ms.bundle_id = coalesce(a.bundle_id, '')
        and ms.recorded_on = p_today
    )
    and (public.get_workspace_plan(a.workspace_id)).sort_order >= (
      select sort_order from public.plans where slug = 'pro'
    )
    order by a.store, upper(coalesce(a.country, 'US')), a.store_id, a.bundle_id
  ) s
  order by s.last_recorded asc nulls first
  limit p_limit;
$$;
