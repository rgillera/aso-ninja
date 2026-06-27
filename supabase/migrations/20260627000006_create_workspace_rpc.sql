-- RPC for users to create additional workspaces after their default one.
-- Uses auth.uid() so no user_id param is needed from the client.
create or replace function create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_slug   text;
begin
  -- slug: lowercase name + first 8 chars of user id + 4-char random suffix for uniqueness
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
