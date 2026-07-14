-- Freeze excess *workspaces* when a subscription downgrades below the
-- number of workspaces the user already owns — the one gap called out in
-- 20260713000001_plan_limit_reconciliation.sql's header comment.
--
-- Unlike keywords/apps/members/competitors, a frozen workspace isn't
-- reflected by freezing every row inside it. Instead the workspace itself
-- carries the flag, and the app blocks access to a frozen workspace's
-- content wholesale (still visible in the switcher, marked locked) while
-- leaving the underlying data untouched — same "purely reversible on
-- upgrade" property the row-level freezing already has.

alter table workspaces add column status text not null default 'active' check (status in ('active', 'frozen'));

create index on workspaces (status);

create or replace function reconcile_workspace_limits(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  v_plan := public.get_effective_plan(p_user_id);

  with ranked as (
    select w.id, row_number() over (order by w.created_at asc) as rn
    from public.workspaces w
    join public.workspace_members wm on wm.workspace_id = w.id and wm.role = 'owner'
    where wm.user_id = p_user_id
  ),
  desired as (
    select id, case when v_plan.workspace_limit is null or rn <= v_plan.workspace_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.workspaces w
  set status = desired.status, updated_at = now()
  from desired
  where desired.id = w.id and w.status is distinct from desired.status;
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

-- Belt-and-suspenders: even though the app blocks navigation into a frozen
-- workspace, also refuse writes at the DB layer so a direct API call can't
-- add content to one.

create or replace function enforce_keyword_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_owner        uuid;
  v_plan         public.plans;
  v_count        integer;
begin
  for v_workspace_id in select distinct workspace_id from inserted_keywords loop
    if (select status from public.workspaces where id = v_workspace_id) = 'frozen' then
      raise exception 'This workspace is paused because it exceeds your plan''s workspace limit. Upgrade to restore access.';
    end if;

    v_owner := public.get_workspace_owner(v_workspace_id);
    if v_owner is null then
      continue;
    end if;

    v_plan := public.get_effective_plan(v_owner);

    if v_plan.keyword_limit is not null then
      select count(*) filter (where k.status = 'active') into v_count
      from public.keywords k
      join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
      where wm.user_id = v_owner;

      if v_count > v_plan.keyword_limit then
        raise exception 'Keyword limit reached for your plan (% keywords). Upgrade to track more.', v_plan.keyword_limit;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function enforce_app_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_plan         public.plans;
  v_count        integer;
begin
  for v_workspace_id in select distinct workspace_id from inserted_apps loop
    if (select status from public.workspaces where id = v_workspace_id) = 'frozen' then
      raise exception 'This workspace is paused because it exceeds your plan''s workspace limit. Upgrade to restore access.';
    end if;

    v_plan := public.get_workspace_plan(v_workspace_id);

    if v_plan.app_limit is not null then
      select count(*) filter (where status = 'active') into v_count
      from public.apps where workspace_id = v_workspace_id;

      if v_count > v_plan.app_limit then
        raise exception 'App limit reached for your plan (% apps per workspace). Upgrade to track more.', v_plan.app_limit;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function enforce_competitor_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_plan         public.plans;
  v_count        integer;
begin
  select workspace_id into v_workspace_id from public.apps where id = new.app_id;

  if (select status from public.workspaces where id = v_workspace_id) = 'frozen' then
    raise exception 'This workspace is paused because it exceeds your plan''s workspace limit. Upgrade to restore access.';
  end if;

  v_plan := public.get_workspace_plan(v_workspace_id);

  if v_plan.competitor_limit is not null then
    select count(*) filter (where status = 'active') into v_count
    from public.app_competitors
    where app_id = new.app_id;

    if v_count >= v_plan.competitor_limit then
      raise exception 'Competitor limit reached for your plan (% competitors per app). Upgrade to track more.', v_plan.competitor_limit;
    end if;
  end if;

  return new;
end;
$$;

create or replace function enforce_member_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan  public.plans;
  v_count integer;
begin
  if new.role = 'owner' then
    return new;
  end if;

  if (select status from public.workspaces where id = new.workspace_id) = 'frozen' then
    raise exception 'This workspace is paused because it exceeds your plan''s workspace limit. Upgrade to restore access.';
  end if;

  v_plan := public.get_workspace_plan(new.workspace_id);

  if v_plan.member_limit is not null then
    select count(*) filter (where status = 'active') into v_count
    from public.workspace_members
    where workspace_id = new.workspace_id and role <> 'owner';

    if v_count >= v_plan.member_limit then
      raise exception 'Member limit reached for this workspace''s plan (% members). Upgrade to add more.', v_plan.member_limit;
    end if;
  end if;

  return new;
end;
$$;

-- One-time backfill: freeze anyone already over their workspace_limit today
-- (e.g. downgraded before this migration existed) instead of waiting for
-- their next Stripe event.
do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from public.workspace_members where role = 'owner' loop
    perform public.reconcile_workspace_limits(v_owner);
  end loop;
end;
$$;
