-- Timeline: keep each snapshot's "What's New" text and the store's release
-- date for that version, so a version update (yours or a competitor's) can
-- show what the release said and sit on the day it actually shipped, not the
-- first day a snapshot happened to see it. Both null on rows recorded before
-- these columns existed.
alter table public.metadata_snapshots
  add column release_notes text,
  add column version_released_on date;
