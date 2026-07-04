-- Pending invites for emails without an account yet. Consumed by
-- handle_new_user() once the invitee registers, so they land directly in
-- the workspace(s) they were invited to instead of a fresh default one.

create table workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         workspace_role not null default 'member',
  access       workspace_access[] not null default array['aso_intelligence', 'market_intelligence']::workspace_access[],
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

create index on workspace_invites (email);

alter table workspace_invites enable row level security;

create policy "owners and admins can manage invites"
  on workspace_invites for all
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_slug   text;
  display_name     text;
  invited_count    int;
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
  );

  insert into public.workspace_members (workspace_id, user_id, role, access)
  select workspace_id, new.id, role, access
  from public.workspace_invites
  where email = lower(trim(new.email))
  on conflict (workspace_id, user_id) do nothing;

  get diagnostics invited_count = row_count;

  delete from public.workspace_invites where email = lower(trim(new.email));

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
