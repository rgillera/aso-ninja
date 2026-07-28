-- Persist the search-results count (competition signal for the Results
-- column) alongside the other cached metrics. Nullable rather than
-- `not null default 0`: existing rows predate this column and haven't
-- actually been counted, so they should render as "unknown" (null) rather
-- than a misleading "0 results" until the next recompute naturally fills
-- them in (see CACHE_TTL_MS in app/api/keywords/metrics/route.ts).
alter table keyword_metrics add column results integer;
