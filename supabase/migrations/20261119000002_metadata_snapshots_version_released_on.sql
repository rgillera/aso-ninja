-- Timeline: keep the store's release date for each snapshot's version
-- (App Store currentVersionReleaseDate / Play "updated"), so a version update
-- sits on the day it actually shipped, not the first day a snapshot happened
-- to see it. Null on rows recorded before this column existed; the
-- refresh-metadata cron backfills it onto earlier rows still on the current
-- version.
--
-- Separate from 20261119000001: that one was already applied when this
-- column was added, so adding it there would never run.
alter table public.metadata_snapshots add column if not exists version_released_on date;
