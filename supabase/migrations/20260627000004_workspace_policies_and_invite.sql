-- 1. Workspaces: add UPDATE and DELETE policies for owners
create policy "owners can update their workspace"
  on workspaces for update
  using (id = any(get_my_workspace_ids()))
  with check (id = any(get_my_workspace_ids()));

create policy "owners can delete their workspace"
  on workspaces for delete
  using (
    id = any(get_my_workspace_ids())
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- 2. Profiles: allow workspace members to read each other's full_name / avatar_url
drop policy if exists "users can view their own profile" on profiles;

create policy "users can view profiles in shared workspaces"
  on profiles for select
  using (
    id = auth.uid()
    or id in (
      select user_id
      from public.workspace_members
      where workspace_id = any(get_my_workspace_ids())
    )
  );

-- 3. RPC: look up a user ID by email (security definer — queries auth.users)
create or replace function get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from auth.users where email = lower(trim(p_email)) limit 1;
$$;
