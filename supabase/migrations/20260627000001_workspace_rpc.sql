-- Move workspace creation out of the trigger and into app code via RPC.
-- The trigger now only creates the profile; the app calls this function explicitly.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- RPC called after signup/oauth to create the default workspace
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
  workspace_slug := lower(regexp_replace(p_name, '[^a-z0-9]+', '-', 'g'))
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
