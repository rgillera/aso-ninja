-- Unlimited apps on the Free plan too, matching every paid tier (see
-- 20260729000001_unlimited_apps_all_plans.sql). Free keeps its
-- competitor_limit of 1 per app as the tier differentiator; app count no
-- longer is.
update plans set app_limit = null, updated_at = now()
where slug = 'free';

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
