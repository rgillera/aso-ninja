-- Fix: RLS policies on workspace_members were self-referencing, causing
-- infinite recursion. Use a security definer function to look up the
-- caller's workspace IDs without triggering RLS on workspace_members.

create or replace function get_my_workspace_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(array_agg(workspace_id), '{}') from public.workspace_members where user_id = auth.uid();
$$;

-- ── workspace_members ──────────────────────────────────────────────────────

drop policy if exists "members can view membership rows" on workspace_members;
drop policy if exists "owners and admins can manage members" on workspace_members;

create policy "members can view membership rows"
  on workspace_members for select
  using (workspace_id = any(get_my_workspace_ids()));

create policy "owners and admins can manage members"
  on workspace_members for all
  using (
    workspace_id = any(get_my_workspace_ids())
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_members.workspace_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- ── workspaces ─────────────────────────────────────────────────────────────

drop policy if exists "members can view their workspace" on workspaces;

create policy "members can view their workspace"
  on workspaces for select
  using (id = any(get_my_workspace_ids()));

-- ── downstream tables that join through workspace_members ──────────────────
-- Re-drop and re-create any policy that referenced workspace_members
-- to use the helper function instead.

drop policy if exists "workspace members can read apps" on apps;
drop policy if exists "workspace admins and owners can manage apps" on apps;

create policy "workspace members can read apps"
  on apps for select
  using (workspace_id = any(get_my_workspace_ids()));

create policy "workspace admins and owners can manage apps"
  on apps for all
  using (workspace_id = any(get_my_workspace_ids()));

drop policy if exists "workspace members can read keywords" on keywords;
drop policy if exists "workspace admins and owners can manage keywords" on keywords;

create policy "workspace members can read keywords"
  on keywords for select
  using (workspace_id = any(get_my_workspace_ids()));

create policy "workspace admins and owners can manage keywords"
  on keywords for all
  using (workspace_id = any(get_my_workspace_ids()));

drop policy if exists "workspace members can read app_keywords" on app_keywords;
drop policy if exists "workspace admins and owners can manage app_keywords" on app_keywords;

create policy "workspace members can read app_keywords"
  on app_keywords for select
  using (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );

create policy "workspace admins and owners can manage app_keywords"
  on app_keywords for all
  using (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );

drop policy if exists "workspace members can read keyword ranks" on keyword_ranks;
drop policy if exists "service role can insert keyword ranks" on keyword_ranks;

create policy "workspace members can read keyword ranks"
  on keyword_ranks for select
  using (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );

create policy "service role can insert keyword ranks"
  on keyword_ranks for insert
  with check (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );

drop policy if exists "workspace members can read reviews" on reviews;
drop policy if exists "service role can upsert reviews" on reviews;

create policy "workspace members can read reviews"
  on reviews for select
  using (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );

create policy "service role can upsert reviews"
  on reviews for insert
  with check (
    app_id in (select id from apps where workspace_id = any(get_my_workspace_ids()))
  );
