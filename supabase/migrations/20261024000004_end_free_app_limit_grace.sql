-- Ends the Free plan app-limit grace period from
-- 20261017000002_free_app_limit_grace.sql now instead of waiting for the
-- expire-app-grace cron, and removes the grace machinery: every workspace is
-- held to its plan's real app_limit, keeping the apps the user picked
-- (apps.pinned_at) and freezing the rest.

create or replace function get_workspace_app_limit(p_workspace_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select (public.get_workspace_plan(p_workspace_id)).app_limit;
$$;

do $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in
    select id from public.workspaces where app_limit_grace_until is not null
  loop
    perform public.reconcile_app_limits(v_workspace_id);
  end loop;
end;
$$;

drop function expire_app_limit_grace();

alter table workspaces drop column app_limit_grace_until;
