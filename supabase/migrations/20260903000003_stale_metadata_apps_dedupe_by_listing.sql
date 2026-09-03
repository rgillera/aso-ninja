-- Now that metadata_snapshots is shared by real listing identity rather than
-- by workspace app_id (see 20260903000002), dedupe candidates the same way:
-- two workspaces tracking the identical app must not both trigger an Apple/
-- Google fetch for it in the same cron run, and "already snapshotted today"
-- must be checked by listing identity, not by whichever workspace's apps
-- row happens to be looked at.
--
-- DISTINCT ON picks one apps row per real listing (tie-broken by staleness,
-- though ties only affect which row's id/workspace_id is reported — the
-- fetch itself is keyed off store/store_id/bundle_id/country, identical for
-- every row in the group); the outer query then re-sorts the deduped set by
-- true staleness before LIMIT, since DISTINCT ON's own ordering is
-- dominated by the identity columns it groups on.
create or replace function stale_metadata_apps(p_today date, p_limit int default 200)
returns table(id uuid, workspace_id uuid, store text, bundle_id text, store_id text, country text)
language sql security definer set search_path = ''
as $$
  select id, workspace_id, store, bundle_id, store_id, country
  from (
    select distinct on (a.store, coalesce(a.country, 'US'), coalesce(a.store_id, ''), coalesce(a.bundle_id, ''))
      a.id, a.workspace_id, a.store, a.bundle_id, a.store_id, a.country,
      (
        select max(ms2.recorded_on) from public.metadata_snapshots ms2
        where ms2.store = a.store
          and ms2.country = coalesce(a.country, 'US')
          and ms2.store_id = coalesce(a.store_id, '')
          and ms2.bundle_id = coalesce(a.bundle_id, '')
      ) as last_recorded
    from public.apps a
    where not exists (
      select 1 from public.metadata_snapshots ms
      where ms.store = a.store
        and ms.country = coalesce(a.country, 'US')
        and ms.store_id = coalesce(a.store_id, '')
        and ms.bundle_id = coalesce(a.bundle_id, '')
        and ms.recorded_on = p_today
    )
    and (public.get_workspace_plan(a.workspace_id)).sort_order >= (
      select sort_order from public.plans where slug = 'pro'
    )
    order by a.store, coalesce(a.country, 'US'), coalesce(a.store_id, ''), coalesce(a.bundle_id, ''), last_recorded asc nulls first
  ) dedup
  order by last_recorded asc nulls first
  limit p_limit;
$$;
