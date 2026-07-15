-- Same fairness fix as stale_keywords_today: without an ORDER BY, Postgres
-- could keep returning the same subset of apps run after run once the
-- eligible count exceeds p_limit. Order by each app's last recorded
-- snapshot date (oldest first; never-snapshotted apps — null — go first of
-- all) so every eligible app is guaranteed a turn within a bounded number
-- of runs.
create or replace function stale_metadata_apps(p_today date, p_limit int default 200)
returns table(id uuid, workspace_id uuid, store text, bundle_id text, store_id text, country text)
language sql security definer set search_path = ''
as $$
  select a.id, a.workspace_id, a.store, a.bundle_id, a.store_id, a.country
  from public.apps a
  where not exists (
    select 1 from public.metadata_snapshots ms
    where ms.app_id = a.id and ms.recorded_on = p_today
  )
  and (public.get_workspace_plan(a.workspace_id)).sort_order >= (
    select sort_order from public.plans where slug = 'pro_plus'
  )
  order by (
    select max(ms2.recorded_on) from public.metadata_snapshots ms2 where ms2.app_id = a.id
  ) asc nulls first
  limit p_limit;
$$;
