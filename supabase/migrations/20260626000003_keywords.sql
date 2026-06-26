-- Keywords are workspace-scoped; apps link to them via app_keywords

create table keywords (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  term         text not null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, term)
);

create index on keywords (workspace_id);

create table app_keywords (
  id         uuid primary key default gen_random_uuid(),
  app_id     uuid not null references apps(id) on delete cascade,
  keyword_id uuid not null references keywords(id) on delete cascade,
  tag        text,   -- e.g. 'branded', 'competitor', 'generic'
  added_at   timestamptz not null default now(),
  unique (app_id, keyword_id)
);

create index on app_keywords (app_id);
create index on app_keywords (keyword_id);

-- RLS
alter table keywords enable row level security;
alter table app_keywords enable row level security;

create policy "workspace members can read keywords"
  on keywords for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace admins and owners can manage keywords"
  on keywords for all
  using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

create policy "workspace members can read app_keywords"
  on app_keywords for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace admins and owners can manage app_keywords"
  on app_keywords for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  ));
