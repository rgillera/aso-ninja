-- Free plan goes back to a 2-app limit per workspace (undoing
-- 20260731000001_free_plan_unlimited_apps.sql). Each country is its own apps
-- row (unique on workspace_id, store, bundle_id, country), so this is
-- "2 apps or countries": 1 app in 2 countries, or 2 apps in 1 country each.
--
-- Existing workspaces already over that get a grace period instead of being
-- frozen on deploy: app_limit_grace_until. Until it passes,
-- reconcile_app_limits treats the workspace as unlimited, so nothing they
-- already track is frozen. enforce_app_limit still uses the plan's real
-- limit, so a grandfathered workspace keeps what it has but can't add more.
-- The expire-app-grace cron (expire_app_limit_grace below) clears the date
-- and reconciles once it passes.
--
-- apps.pinned_at lets the user pick which apps stay active instead of
-- "oldest wins": reconciliation ranks pinned apps first, most recently
-- pinned first, so with a limit of 2 the last two picks stay active.

alter table workspaces add column app_limit_grace_until timestamptz;
alter table apps add column pinned_at timestamptz;

create index on workspaces (app_limit_grace_until) where app_limit_grace_until is not null;

-- Limit used for freezing: null (unlimited) while the workspace is inside its
-- grace period, otherwise the plan's app_limit.
create or replace function get_workspace_app_limit(p_workspace_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select case
    when w.app_limit_grace_until is not null and w.app_limit_grace_until > now() then null
    else (public.get_workspace_plan(w.id)).app_limit
  end
  from public.workspaces w
  where w.id = p_workspace_id;
$$;

create or replace function reconcile_app_limits(p_workspace_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_limit integer;
begin
  v_limit := public.get_workspace_app_limit(p_workspace_id);

  with ranked as (
    select a.id, row_number() over (order by a.pinned_at desc nulls last, a.created_at asc) as rn
    from public.apps a
    where a.workspace_id = p_workspace_id
  ),
  desired as (
    select id, case when v_limit is null or rn <= v_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.apps a
  set status = desired.status
  from desired
  where desired.id = a.id and a.status is distinct from desired.status;
end;
$$;

-- Lets a workspace owner/admin choose an app to keep active. It becomes the
-- most recent pick, so it bumps the oldest pick out once the workspace is at
-- its limit. During the grace period this only records the choice;
-- afterwards it swaps which app is frozen right away. clock_timestamp() (not
-- now()) so two picks in one transaction still order correctly.
create or replace function set_active_app(p_app_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from public.apps where id = p_app_id;

  if v_workspace_id is null or not exists (
    select 1 from public.workspace_members
    where workspace_id = v_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can choose the active app.';
  end if;

  update public.apps set pinned_at = clock_timestamp() where id = p_app_id;
  perform public.reconcile_app_limits(v_workspace_id);
end;
$$;

revoke execute on function public.set_active_app(uuid) from public, anon;
grant execute on function public.set_active_app(uuid) to authenticated;

-- Called by the expire-app-grace cron with the service role.
create or replace function expire_app_limit_grace()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_count        integer := 0;
begin
  for v_workspace_id in
    select id from public.workspaces
    where app_limit_grace_until is not null and app_limit_grace_until <= now()
  loop
    update public.workspaces set app_limit_grace_until = null where id = v_workspace_id;
    perform public.reconcile_app_limits(v_workspace_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.expire_app_limit_grace() from public, anon, authenticated;

-- Same as 20260714000004_workspace_freeze.sql's version, with a message
-- that explains each country counts as an app.
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
        raise exception 'Your plan covers % apps or countries (each country counts as one). Upgrade to track more.', v_plan.app_limit;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

-- A frozen app is read-only: refuse new tracked keywords on it, the same way
-- frozen workspaces refuse writes (20260714000004_workspace_freeze.sql).
create or replace function enforce_app_not_frozen()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select status from public.apps where id = new.app_id) = 'frozen' then
    raise exception 'This app is paused because your plan covers fewer apps. Upgrade to resume tracking.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_app_not_frozen
  before insert on app_keywords
  for each row
  execute function enforce_app_not_frozen();

-- Grandfather every workspace that already tracks more than two apps (or
-- countries), then lower the limit. 7 days from whenever this is applied.
update public.workspaces w
set app_limit_grace_until = now() + interval '7 days'
where (select count(*) from public.apps a where a.workspace_id = w.id) > 2;

update plans set app_limit = 2, updated_at = now()
where slug = 'free';
