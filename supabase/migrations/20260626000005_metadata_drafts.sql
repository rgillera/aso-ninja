-- Metadata drafts — versioned, never deleted (archive instead)

create type metadata_status as enum ('draft', 'published', 'archived');

create table metadata_drafts (
  id             uuid primary key default gen_random_uuid(),
  app_id         uuid not null references apps(id) on delete cascade,
  locale         text not null default 'en-US',
  status         metadata_status not null default 'draft',
  title          text,
  subtitle       text,
  description    text,
  keyword_field  text,   -- iOS-specific 100-char keywords field
  release_notes  text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on metadata_drafts (app_id, status);
create index on metadata_drafts (app_id, locale, status);

-- RLS
alter table metadata_drafts enable row level security;

create policy "workspace members can read metadata drafts"
  on metadata_drafts for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can create drafts"
  on metadata_drafts for insert
  with check (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can update drafts"
  on metadata_drafts for update
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
