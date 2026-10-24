-- Bug: a Pro user who scored, say, 300 keywords and then cancelled kept
-- seeing all 300 relevancy/opportunity scores on Free, whose pool is 40.
-- reconcile_plan_limits froze keywords over keyword_limit, but nothing ever
-- touched already-scored keyword_metrics -- enforce_relevancy_limit() only
-- stops *new* scores, so a downgrade left the whole paid pool visible.
--
-- Fix: same freeze-don't-delete shape as keywords.status. Scored rows beyond
-- the owner's relevancy_limit (oldest keyword first, matching
-- reconcile_keyword_limits' order) get relevancy_frozen = true and read back
-- as unscored ("Limit" in the UI). The score itself is kept, so upgrading
-- again unfreezes them with no re-scoring. Frozen rows still count toward
-- relevancy_scored_count, so the pool stays exhausted until the user frees
-- room by removing keywords.
alter table keyword_metrics
  add column relevancy_frozen boolean not null default false;

create or replace function reconcile_relevancy_limits(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  v_plan := public.get_effective_plan(p_user_id);

  with ranked as (
    select km.id, row_number() over (order by k.created_at asc, km.id asc) as rn
    from public.keyword_metrics km
    join public.keywords k on k.id = km.keyword_id
    join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
    where wm.user_id = p_user_id and km.relevancy_scored
  ),
  desired as (
    select id, (v_plan.relevancy_limit is not null and rn > v_plan.relevancy_limit) as frozen
    from ranked
  )
  update public.keyword_metrics km
  set relevancy_frozen = desired.frozen
  from desired
  where desired.id = km.id and km.relevancy_frozen is distinct from desired.frozen;
end;
$$;

create or replace function reconcile_plan_limits(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_app_id       uuid;
begin
  perform public.reconcile_keyword_limits(p_user_id);
  perform public.reconcile_relevancy_limits(p_user_id);
  perform public.reconcile_workspace_limits(p_user_id);

  for v_workspace_id in
    select workspace_id from public.workspace_members
    where user_id = p_user_id and role = 'owner'
  loop
    perform public.reconcile_app_limits(v_workspace_id);
    perform public.reconcile_member_limits(v_workspace_id);

    for v_app_id in select id from public.apps where workspace_id = v_workspace_id loop
      perform public.reconcile_competitor_limits(v_app_id);
    end loop;
  end loop;
end;
$$;

-- Removing keywords frees pool room, so promote the oldest frozen scores
-- back the same way a freed keyword slot promotes a frozen keyword.
create or replace function reconcile_after_keyword_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_owner        uuid;
begin
  for v_workspace_id in select distinct workspace_id from deleted_keywords loop
    v_owner := public.get_workspace_owner(v_workspace_id);
    if v_owner is not null then
      perform public.reconcile_keyword_limits(v_owner);
      perform public.reconcile_relevancy_limits(v_owner);
    end if;
  end loop;
  return null;
end;
$$;

-- Backfill: freeze scores for everyone already downgraded.
do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from workspace_members where role = 'owner' loop
    perform reconcile_relevancy_limits(v_owner);
  end loop;
end;
$$;
