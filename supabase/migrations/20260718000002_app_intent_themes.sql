-- Per-app search-intent themes (e.g. for a pet care app: "ai pet care",
-- "pet records", "shared pet care") — generated once per app via LLM, then
-- keywords are classified against this app-specific list (bundled into the
-- same LLM call that already scores relevancy) so tracked keywords can be
-- grouped for building intent-based ASA campaigns.

create table app_intent_themes (
  id         uuid primary key default gen_random_uuid(),
  app_id     uuid not null references apps(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  -- User-added themes survive a "Regenerate intents" pass — only LLM-generated
  -- (is_manual = false) themes are diffed against the fresh label list and
  -- dropped when they don't recur.
  is_manual  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (app_id, label)
);

create index on app_intent_themes (app_id);

-- Unclassified / no-match keywords are null, shown as an "Other" bucket
-- client-side rather than a real row here.
alter table keyword_metrics
  add column intent_theme_id uuid references app_intent_themes(id) on delete set null;

alter table app_intent_themes enable row level security;

create policy "workspace members can read app_intent_themes"
  on app_intent_themes for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can manage app_intent_themes"
  on app_intent_themes for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
