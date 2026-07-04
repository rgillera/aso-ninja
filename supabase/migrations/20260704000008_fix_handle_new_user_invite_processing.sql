-- 20260704000003_plans_and_subscriptions.sql redefined handle_new_user() after
-- 20260704000002_workspace_invites.sql did, silently dropping the invite
-- consumption / default-workspace-creation logic. Since then, new users
-- (invited or not) only got a profile + free subscription — pending
-- workspace_invites rows were never turned into workspace_members, and
-- setPasswordAction (the invited-user path) has no fallback to create a
-- default workspace either, so invited users landed with zero workspaces.
--
-- Restore the full behavior, and additionally isolate each invite in its own
-- sub-transaction: if a workspace's plan has since hit its member limit,
-- that one invite is skipped (left pending for the owner to see) instead of
-- aborting the whole signup for an unrelated reason.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_slug   text;
  display_name     text;
  invited_count    int := 0;
  inv              record;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan_id)
  select new.id, id from public.plans where slug = 'free'
  on conflict (user_id) do nothing;

  for inv in
    select workspace_id, role, access
    from public.workspace_invites
    where email = lower(trim(new.email))
  loop
    begin
      insert into public.workspace_members (workspace_id, user_id, role, access)
      values (inv.workspace_id, new.id, inv.role, inv.access)
      on conflict (workspace_id, user_id) do nothing;

      invited_count := invited_count + 1;

      delete from public.workspace_invites
      where workspace_id = inv.workspace_id and email = lower(trim(new.email));
    exception when others then
      -- e.g. the workspace's plan member limit was hit since the invite was
      -- sent — leave this invite pending and keep processing the rest.
      null;
    end;
  end loop;

  if invited_count = 0 then
    workspace_slug := lower(regexp_replace(display_name, '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(new.id::text, 1, 8);

    insert into public.workspaces (name, slug)
    values (display_name || '''s Workspace', workspace_slug)
    returning id into new_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'owner');
  end if;

  return new;
end;
$$;
