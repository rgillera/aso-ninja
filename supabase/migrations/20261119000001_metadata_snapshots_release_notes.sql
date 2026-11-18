-- Timeline: keep each snapshot's "What's New" text, so a version update
-- (yours or a competitor's) can show what the release said, not just the
-- version number. Null on rows recorded before this column existed.
alter table public.metadata_snapshots add column release_notes text;
