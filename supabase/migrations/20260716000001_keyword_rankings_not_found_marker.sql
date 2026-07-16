-- A Live Search that runs but doesn't find a tracked app anywhere in the
-- (fixed-size) results previously left no row at all for that app on that
-- day — making "we searched, app just isn't ranked" indistinguishable from
-- "never searched", so genuinely unranked keywords retried forever and never
-- left the "N unranked" queue. Recording a null-position row when the
-- tracked app isn't found requires keying uniqueness on app_id rather than
-- position, since a "not found" row has no natural position.

-- Old constraint keyed on position could already hold more than one row per
-- (day, app) if the same app was searched more than once in a day at a
-- shifting position (e.g. add-time metrics search vs. a later Live Search
-- retry) — collapse those to the most recent before the new constraint goes on.
delete from keyword_rankings_history a
using keyword_rankings_history b
where a.keyword = b.keyword
  and a.store = b.store
  and a.country = b.country
  and a.recorded_on = b.recorded_on
  and a.app_id = b.app_id
  and (a.created_at, a.id) < (b.created_at, b.id);

alter table keyword_rankings_history alter column position drop not null;

alter table keyword_rankings_history
  drop constraint keyword_rankings_history_keyword_store_country_recorded_on__key;

alter table keyword_rankings_history
  add constraint keyword_rankings_history_app_snapshot_key
  unique (keyword, store, country, recorded_on, app_id);
