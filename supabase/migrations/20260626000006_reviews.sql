-- App reviews synced from App Store / Google Play

create table reviews (
  id              uuid primary key default gen_random_uuid(),
  app_id          uuid not null references apps(id) on delete cascade,
  store_review_id text not null,    -- ID from the store; prevents duplicate inserts
  store           app_store not null,
  author          text,
  rating          smallint not null check (rating between 1 and 5),
  title           text,
  body            text,
  locale          text,
  version         text,
  reviewed_at     timestamptz,
  replied_at      timestamptz,
  reply_body      text,
  synced_at       timestamptz not null default now(),
  unique (app_id, store_review_id)
);

create index on reviews (app_id, reviewed_at desc);
create index on reviews (app_id, rating);

-- RLS
alter table reviews enable row level security;

create policy "workspace members can read reviews"
  on reviews for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "service role can upsert reviews"
  on reviews for insert
  with check (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
