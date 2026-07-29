-- Unlimited apps on every paid plan. Previously only Enterprise had
-- app_limit = null; basic/pro/pro_plus capped at 5/10/20 apps per workspace
-- respectively. Free stays capped at 1 app -- still the free-tier upgrade
-- trigger. Competitor-per-app and keyword limits are unchanged -- those
-- stay the tier differentiators.
update plans set app_limit = null, updated_at = now()
where slug in ('basic', 'pro', 'pro_plus');

-- Unfreeze any apps that were previously frozen for exceeding the old
-- per-workspace app limit, now that the limit is gone.
do $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in select id from public.workspaces loop
    perform public.reconcile_app_limits(v_workspace_id);
  end loop;
end;
$$;
