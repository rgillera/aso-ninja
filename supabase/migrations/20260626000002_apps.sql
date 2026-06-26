-- Apps — one row per app per store

create type app_store as enum ('ios', 'android');

create table apps (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  store        app_store not null,
  bundle_id    text not null,       -- e.g. com.example.app
  store_id     text not null,       -- numeric App Store ID or Play package name
  icon_url     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, store, bundle_id)
);

create index on apps (workspace_id);

-- RLS
alter table apps enable row level security;

create policy "workspace members can read apps"
  on apps for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace admins and owners can manage apps"
  on apps for all
  using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));
