-- Long Tail Keywords: seed groups and their generated combinations.
-- Previously kept only in browser localStorage (keyed by whatever appId the
-- client had on hand), which silently "lost" a group's data whenever that
-- key changed — e.g. a previewed app has no apps-table row yet so the client
-- fell back to store_id, then got a different key (the real apps.id) once
-- the app was followed/tracked. Persisting server-side keys everything off
-- the same apps.id that /api/keywords/save already resolves to, so this
-- can't happen again, and groups now survive across browsers/devices too.

create table keyword_combination_groups (
  id         uuid primary key default gen_random_uuid(),
  app_id     uuid not null references apps(id) on delete cascade,
  seed       text not null,
  expanded   boolean not null default true,
  created_at timestamptz not null default now(),
  unique (app_id, seed)
);

create index on keyword_combination_groups (app_id);

create table keyword_combination_children (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references keyword_combination_groups(id) on delete cascade,
  term       text not null,
  volume     integer not null default 0,
  results    integer not null default 0,
  difficulty integer not null default 0,
  chance     integer not null default 0,
  unique (group_id, term)
);

create index on keyword_combination_children (group_id);

-- RLS
alter table keyword_combination_groups enable row level security;
alter table keyword_combination_children enable row level security;

create policy "workspace members can read keyword_combination_groups"
  on keyword_combination_groups for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can manage keyword_combination_groups"
  on keyword_combination_groups for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can read keyword_combination_children"
  on keyword_combination_children for select
  using (group_id in (
    select id from keyword_combination_groups where app_id in (
      select id from apps where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  ));

create policy "workspace members can manage keyword_combination_children"
  on keyword_combination_children for all
  using (group_id in (
    select id from keyword_combination_groups where app_id in (
      select id from apps where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  ));
