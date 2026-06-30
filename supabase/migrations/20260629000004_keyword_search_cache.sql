-- Extend the existing global popularity-snapshot cache to also store the raw
-- iTunes search results for a term/store/country/day. Volume, diff, and rank
-- are all derived from the same search and don't depend on which app is
-- asking, so caching the raw results here lets every app/workspace reuse a
-- single iTunes call per term per day instead of each app triggering its own.
alter table keyword_popularity_snapshots
  add column diff integer,
  add column raw_apps jsonb;
