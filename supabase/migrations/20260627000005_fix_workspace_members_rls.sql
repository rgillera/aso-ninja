-- Fix: "owners and admins can manage members" FOR ALL policy had a self-referential
-- EXISTS subquery that caused infinite recursion when workspace_members was
-- queried directly. Replace it with a security definer helper + separate
-- per-operation policies that don't reference workspace_members from within
-- a workspace_members policy.

create or replace function is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Drop the recursive FOR ALL policy
drop policy if exists "owners and admins can manage members" on workspace_members;

-- Re-create as separate per-operation policies using the security definer helper
create policy "admins can insert members"
  on workspace_members for insert
  with check (is_workspace_admin(workspace_id));

create policy "admins can update members"
  on workspace_members for update
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

create policy "admins can delete members"
  on workspace_members for delete
  using (is_workspace_admin(workspace_id));
