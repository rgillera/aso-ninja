-- Workspaces & membership

create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type workspace_role as enum ('owner', 'admin', 'member');

create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         workspace_role not null default 'member',
  joined_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Indexes
create index on workspace_members (user_id);
create index on workspace_members (workspace_id);

-- RLS
alter table workspaces enable row level security;
alter table workspace_members enable row level security;

create policy "members can view their workspace"
  on workspaces for select
  using (
    id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

create policy "members can view membership rows"
  on workspace_members for select
  using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  ));

create policy "owners and admins can manage members"
  on workspace_members for all
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
