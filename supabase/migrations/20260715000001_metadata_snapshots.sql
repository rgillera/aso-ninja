-- Daily metadata snapshots per app: recorded whenever the Timeline dashboard
-- is viewed (same convention as rating_snapshots / keyword_rankings_history),
-- since the App Store and Play Store public APIs only ever expose a live
-- snapshot of a listing, never its history.

create table metadata_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  app_id             uuid not null references apps(id) on delete cascade,
  recorded_on        date not null default current_date,
  version            text,
  title              text,
  subtitle           text,
  description        text,
  screenshot_urls    jsonb,
  has_preview_video  boolean,
  category           text,
  age_rating         text,
  language_count     integer,
  created_at         timestamptz not null default now(),
  unique (app_id, recorded_on)
);

create index on metadata_snapshots (app_id, recorded_on desc);

alter table metadata_snapshots enable row level security;

create policy "workspace members can manage metadata snapshots"
  on metadata_snapshots for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
