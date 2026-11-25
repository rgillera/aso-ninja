-- Let any workspace member add/remove competitors, matching apps, keywords
-- and app_keywords (relaxed to all members in 20260627000002). The original
-- policy restricted writes to owner/admin, so plain members hit
-- "new row violates row-level security policy" when adding a competitor.

drop policy if exists "workspace members can read competitors" on app_competitors;
drop policy if exists "workspace admins and owners can manage competitors" on app_competitors;

create policy "workspace members can read competitors"
  on app_competitors for select
  using (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );

create policy "workspace members can manage competitors"
  on app_competitors for all
  using (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  )
  with check (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );
