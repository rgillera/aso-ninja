-- Returns followed apps (in workspaces on Pro+ or above — Timeline is a
-- Pro+ feature) that have no metadata_snapshots row yet for today. Used by
-- the daily refresh-metadata cron job.
--
-- Both the "missing today's snapshot" and the plan-tier filters happen here,
-- inside the query, before LIMIT is applied — filtering app-side after an
-- unconditional `.limit()` would silently cap the *candidate* set instead of
-- the *eligible* set: apps beyond the limit window would never be considered
-- again (same bug this replaces), and free/basic/pro apps — which never get
-- a snapshot recorded — would permanently occupy slots in that window since
-- they'd never stop looking "stale".
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
  limit p_limit;
$$;
