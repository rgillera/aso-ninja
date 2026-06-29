-- Allow all workspace members (not just admins/owners) to save keyword research

create policy "workspace members can insert apps"
  on apps for insert
  with check (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can insert keywords"
  on keywords for insert
  with check (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can insert app_keywords"
  on app_keywords for insert
  with check (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
