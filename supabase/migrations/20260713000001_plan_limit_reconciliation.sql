-- Freeze excess keywords/apps/competitors/members when a subscription
-- downgrades below what the user already has, instead of leaving
-- over-limit rows fully active forever (insert-time triggers in
-- 20260704000004_plan_limit_enforcement.sql only ever blocked *new* rows).
--
-- Selection policy: oldest-created rows stay 'active' up to the plan's
-- limit, newest rows get 'frozen'. Reconciliation re-derives status from
-- created_at rank every time rather than remembering "who froze what", so
-- it's naturally reversible on upgrade or after a delete frees up room.
--
-- workspace_limit (excess *owned workspaces*) is intentionally not covered
-- here -- freezing a whole workspace cascades to everything inside it and
-- needs its own UX, not this row-level mechanism.

alter table keywords add column status text not null default 'active' check (status in ('active', 'frozen'));
alter table apps add column status text not null default 'active' check (status in ('active', 'frozen'));
alter table app_competitors add column status text not null default 'active' check (status in ('active', 'frozen'));
alter table workspace_members add column status text not null default 'active' check (status in ('active', 'frozen'));

create index on keywords (workspace_id, status);
create index on apps (workspace_id, status);
create index on app_competitors (app_id, status);
create index on workspace_members (workspace_id, status);

-- Reconciliation functions ---------------------------------------------

create or replace function reconcile_keyword_limits(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  v_plan := public.get_effective_plan(p_user_id);

  with ranked as (
    select k.id, row_number() over (order by k.created_at asc) as rn
    from public.keywords k
    join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
    where wm.user_id = p_user_id
  ),
  desired as (
    select id, case when v_plan.keyword_limit is null or rn <= v_plan.keyword_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.keywords k
  set status = desired.status
  from desired
  where desired.id = k.id and k.status is distinct from desired.status;
end;
$$;

create or replace function reconcile_app_limits(p_workspace_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  v_plan := public.get_workspace_plan(p_workspace_id);

  with ranked as (
    select a.id, row_number() over (order by a.created_at asc) as rn
    from public.apps a
    where a.workspace_id = p_workspace_id
  ),
  desired as (
    select id, case when v_plan.app_limit is null or rn <= v_plan.app_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.apps a
  set status = desired.status
  from desired
  where desired.id = a.id and a.status is distinct from desired.status;
end;
$$;

create or replace function reconcile_competitor_limits(p_app_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_plan         public.plans;
begin
  select workspace_id into v_workspace_id from public.apps where id = p_app_id;
  if v_workspace_id is null then
    return;
  end if;

  v_plan := public.get_workspace_plan(v_workspace_id);

  with ranked as (
    select c.id, row_number() over (order by c.created_at asc) as rn
    from public.app_competitors c
    where c.app_id = p_app_id
  ),
  desired as (
    select id, case when v_plan.competitor_limit is null or rn <= v_plan.competitor_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.app_competitors c
  set status = desired.status
  from desired
  where desired.id = c.id and c.status is distinct from desired.status;
end;
$$;

create or replace function reconcile_member_limits(p_workspace_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  v_plan := public.get_workspace_plan(p_workspace_id);

  with ranked as (
    select wm.id, row_number() over (order by wm.joined_at asc) as rn
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.role <> 'owner'
  ),
  desired as (
    select id, case when v_plan.member_limit is null or rn <= v_plan.member_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.workspace_members wm
  set status = desired.status
  from desired
  where desired.id = wm.id and wm.status is distinct from desired.status;
end;
$$;

-- Single entrypoint: reconciles everything a user's downgrade/upgrade can
-- affect -- their pooled keywords plus every workspace they own.
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

-- Insert-time enforcement: count only active rows, so frozen legacy rows
-- don't count against the cap (they've already been excluded from the
-- active pool by reconciliation).

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

-- Delete-time reconciliation: freeing up an active slot should promote the
-- oldest frozen row back to active, not leave unused frozen capacity idle.

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
    end if;
  end loop;
  return null;
end;
$$;

create trigger trg_reconcile_after_keyword_delete
  after delete on keywords
  referencing old table as deleted_keywords
  for each statement
  execute function reconcile_after_keyword_delete();

create or replace function reconcile_after_app_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in select distinct workspace_id from deleted_apps loop
    perform public.reconcile_app_limits(v_workspace_id);
  end loop;
  return null;
end;
$$;

create trigger trg_reconcile_after_app_delete
  after delete on apps
  referencing old table as deleted_apps
  for each statement
  execute function reconcile_after_app_delete();

create or replace function reconcile_after_competitor_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.reconcile_competitor_limits(old.app_id);
  return null;
end;
$$;

create trigger trg_reconcile_after_competitor_delete
  after delete on app_competitors
  for each row
  execute function reconcile_after_competitor_delete();

create or replace function reconcile_after_member_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in select distinct workspace_id from deleted_members loop
    perform public.reconcile_member_limits(v_workspace_id);
  end loop;
  return null;
end;
$$;

create trigger trg_reconcile_after_member_delete
  after delete on workspace_members
  referencing old table as deleted_members
  for each statement
  execute function reconcile_after_member_delete();

-- Usage read-out: add frozen counts so the UI can show e.g.
-- "20 active / 130 paused" instead of just a raw total. Dropped first since
-- adding output columns changes the function's return row type, which
-- `create or replace` cannot do in place.
drop function if exists get_workspace_usage(uuid);

create function get_workspace_usage(p_workspace_id uuid)
returns table (
  keyword_count        integer,
  keyword_active_count integer,
  keyword_frozen_count integer,
  keyword_limit        integer,
  app_count            integer,
  app_active_count     integer,
  app_frozen_count     integer,
  app_limit            integer,
  member_count         integer,
  member_active_count  integer,
  member_frozen_count  integer,
  member_limit         integer,
  workspace_count      integer,
  workspace_limit      integer
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
    v_plan.workspace_limit;
end;
$$;

-- One-time backfill: correctly reconcile anyone who was already over their
-- current plan's limits before this migration (e.g. downgraded prior to
-- this feature existing), instead of waiting for their next Stripe event.
do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from public.workspace_members where role = 'owner' loop
    perform public.reconcile_plan_limits(v_owner);
  end loop;
end;
$$;
