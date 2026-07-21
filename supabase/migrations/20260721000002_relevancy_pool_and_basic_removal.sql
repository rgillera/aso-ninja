-- Relevancy/opportunity scoring moves from "Basic and up" to "Pro and up"
-- (Basic loses it entirely), and gains a lifetime 1,000-keyword pool on the
-- Pro tier specifically -- Pro+ and Enterprise stay unlimited. The plan-tier
-- gate itself still lives in app code (app/api/keywords/metrics/route.ts,
-- isPlanAtLeast), same as before; this migration only adds the pool size and
-- a durable "was this keyword actually scored" marker so re-fetching an
-- already-scored keyword can't re-spend the pool.

alter table plans add column relevancy_limit integer; -- null = unlimited
update plans set relevancy_limit = 1000, updated_at = now() where slug = 'pro';

alter table keyword_metrics add column relevancy_scored boolean not null default false;

-- Backfill: a nonzero relevancy score can only come from a real computation.
-- Zero is ambiguous (could be a genuine 0 or the column's default), so those
-- rows stay false and get properly (re)scored on next fetch -- one-time,
-- since the whole point of this column is to stop relying on that ambiguity
-- (relevancy is `not null default 0`, so a plan without relevancy access has
-- never actually been able to persist a null sentinel here).
update keyword_metrics set relevancy_scored = true where relevancy > 0;

-- Usage read-out: add the relevancy pool alongside the existing limits,
-- pooled the same way keyword_limit is (across every workspace the
-- subscriber owns) -- a keyword scored for two different apps costs two
-- pool slots since relevancy is computed per-app (it depends on that app's
-- description), matching the actual Gemini call cost.
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
  relevancy_limit        integer
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
    v_plan.relevancy_limit;
end;
$$;
