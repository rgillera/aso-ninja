-- Per-app opt-in layer on top of push_subscriptions. That table is the
-- device's push endpoint (needed to actually send anything, one row per
-- browser registration); this table is which apps a user wants
-- rank-change alerts for (one row per user+app they've turned on). A
-- device only ever needs to register once via /api/push/subscribe — this
-- table is what lets alerts be enabled for one app and not another.
create table push_app_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  app_id     uuid not null references apps(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, app_id)
);

create index on push_app_subscriptions (app_id);

alter table push_app_subscriptions enable row level security;

create policy "users manage their own push app subscriptions"
  on push_app_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
