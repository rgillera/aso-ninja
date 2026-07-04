-- Keywords: pooled keyword limit across every workspace owned by the same user.
--
-- keywords is written via upsert (onConflict "workspace_id,term" in
-- app/api/keywords/save/route.ts), so a row-level BEFORE INSERT trigger would
-- misfire on re-saving an already-tracked keyword: Postgres evaluates
-- BEFORE INSERT row triggers for every candidate row even when
-- ON CONFLICT DO UPDATE ends up resolving it as an update. A statement-level
-- AFTER INSERT trigger with a transition table only includes rows that
-- actually took the INSERT path, so already-existing keywords are correctly
-- excluded from the count.
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
      select count(*) into v_count
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

create trigger trg_enforce_keyword_limit
  after insert on keywords
  referencing new table as inserted_keywords
  for each statement
  execute function enforce_keyword_limit();

-- Apps: per-workspace app limit.
-- Same upsert shape as keywords (followAppAction / keywords/save upsert apps
-- on conflict "workspace_id,store,bundle_id,country"), so use the same
-- statement-level + transition-table technique.
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
      select count(*) into v_count from public.apps where workspace_id = v_workspace_id;

      if v_count > v_plan.app_limit then
        raise exception 'App limit reached for your plan (% apps per workspace). Upgrade to track more.', v_plan.app_limit;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

create trigger trg_enforce_app_limit
  after insert on apps
  referencing new table as inserted_apps
  for each statement
  execute function enforce_app_limit();

-- Members: per-workspace member limit (owner never counts against it).
-- workspace_members is inserted one row at a time (plain insert, no upsert),
-- so a simple row-level BEFORE INSERT trigger is sufficient here.
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
    select count(*) into v_count
    from public.workspace_members
    where workspace_id = new.workspace_id and role <> 'owner';

    if v_count >= v_plan.member_limit then
      raise exception 'Member limit reached for this workspace''s plan (% members). Upgrade to add more.', v_plan.member_limit;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_member_limit
  before insert on workspace_members
  for each row
  execute function enforce_member_limit();

-- Workspaces: max workspaces a user may own. Enforced inside the existing
-- create_workspace RPC (the single funnel the app already calls for
-- creating non-default workspaces) rather than a trigger.
create or replace function create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_slug   text;
  v_plan           public.plans;
  v_owned_count    integer;
begin
  v_plan := public.get_effective_plan(auth.uid());

  if v_plan.workspace_limit is not null then
    select count(*) into v_owned_count
    from public.workspace_members
    where user_id = auth.uid() and role = 'owner';

    if v_owned_count >= v_plan.workspace_limit then
      raise exception 'Workspace limit reached for your plan (% workspaces). Upgrade to create more.', v_plan.workspace_limit;
    end if;
  end if;

  workspace_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')
    || '-' || substr(auth.uid()::text, 1, 8)
    || '-' || substr(gen_random_uuid()::text, 1, 4);

  insert into public.workspaces (name, slug)
  values (trim(p_name), workspace_slug)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');

  return new_workspace_id;
end;
$$;

-- Usage read-out for the subscription UI. Built from the same counting
-- logic as the triggers above so the numbers can't drift apart.
create or replace function get_workspace_usage(p_workspace_id uuid)
returns table (
  keyword_count   integer,
  keyword_limit   integer,
  app_count       integer,
  app_limit       integer,
  member_count    integer,
  member_limit    integer,
  workspace_count integer,
  workspace_limit integer
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
    v_plan.keyword_limit,
    (select count(*)::integer from public.apps where workspace_id = p_workspace_id),
    v_plan.app_limit,
    (select count(*)::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    v_plan.member_limit,
    (select count(*)::integer from public.workspace_members where user_id = v_owner and role = 'owner'),
    v_plan.workspace_limit;
end;
$$;
