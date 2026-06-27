-- Fix slug generation: lowercase the name BEFORE applying the regex so
-- uppercase letters like 'R' in "Rodel" aren't treated as non-[a-z0-9] chars.

create or replace function create_default_workspace(
  p_user_id    uuid,
  p_name       text
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_slug   text;
begin
  workspace_slug := regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')
    || '-' || substr(p_user_id::text, 1, 8);

  insert into public.workspaces (name, slug)
  values (p_name || '''s Workspace', workspace_slug)
  on conflict (slug) do update set name = excluded.name
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, p_user_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new_workspace_id;
end;
$$;
