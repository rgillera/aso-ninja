-- Adds relevancy_frozen_count (scored rows locked by reconcile_relevancy_limits,
-- see 20261024000001_freeze_relevancy_over_pool.sql) so the subscription page
-- can show "40 / 40 (60 paused)" after a downgrade instead of "100 / 40".
-- relevancy_scored_count stays the total: it's what the metrics route checks
-- the pool against, and frozen rows still occupy the pool.
-- Return type changes, so drop + create (same as 20260713000001).
drop function if exists get_workspace_usage(uuid);

create function get_workspace_usage(p_workspace_id uuid)
returns table (
  keyword_count          integer,
  keyword_active_count   integer,
  keyword_frozen_count   integer,
  keyword_limit          integer,
  app_count              integer,
  app_active_count       integer,
  app_frozen_count       integer,
  app_limit              integer,
  member_count           integer,
  member_active_count    integer,
  member_frozen_count    integer,
  member_limit           integer,
  workspace_count        integer,
  workspace_limit        integer,
  relevancy_scored_count integer,
  relevancy_limit        integer,
  relevancy_frozen_count integer
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_plan  public.plans;
begin
  v_owner := public.get_workspace_owner(p_workspace_id);
  v_plan  := public.get_effective_plan(v_owner);

  return query
  select
    (select count(*)::integer from public.keywords k
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner),
    (select count(*) filter (where k.status = 'active')::integer from public.keywords k
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner),
    (select count(*) filter (where k.status = 'frozen')::integer from public.keywords k
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner),
    v_plan.keyword_limit,
    (select count(*)::integer from public.apps where workspace_id = p_workspace_id),
    (select count(*) filter (where status = 'active')::integer from public.apps where workspace_id = p_workspace_id),
    (select count(*) filter (where status = 'frozen')::integer from public.apps where workspace_id = p_workspace_id),
    v_plan.app_limit,
    (select count(*)::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    (select count(*) filter (where status = 'active')::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    (select count(*) filter (where status = 'frozen')::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    v_plan.member_limit,
    (select count(*)::integer from public.workspace_members where user_id = v_owner and role = 'owner'),
    v_plan.workspace_limit,
    (select count(*)::integer from public.keyword_metrics km
       join public.keywords k on k.id = km.keyword_id
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner and km.relevancy_scored),
    v_plan.relevancy_limit,
    (select count(*)::integer from public.keyword_metrics km
       join public.keywords k on k.id = km.keyword_id
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner and km.relevancy_scored and km.relevancy_frozen);
end;
$$;
