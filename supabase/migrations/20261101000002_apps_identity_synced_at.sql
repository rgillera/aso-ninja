-- apps.name / icon_url are copied from the store when an app is followed, and
-- go stale when the developer renames the app or swaps its icon. They are now
-- re-read from the store (see libs/store/app-identity.ts): daily by the
-- sync-app-identity cron, and when the app is opened (throttled). This is the
-- last time that check ran for the row. null = never checked.
alter table public.apps add column identity_synced_at timestamptz;

create index apps_identity_synced_at_idx on public.apps (identity_synced_at nulls first);
