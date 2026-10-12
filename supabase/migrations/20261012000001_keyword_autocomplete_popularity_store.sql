-- Android keyword popularity now comes from Google Play's search suggest
-- (same letter-by-letter walk as iOS — see libs/keyword-autocomplete.ts), so
-- the cache needs a store dimension. Existing rows are all iOS.

alter table keyword_autocomplete_popularity
  add column store text not null default 'ios' check (store in ('ios', 'android'));

alter table keyword_autocomplete_popularity
  drop constraint keyword_autocomplete_popularity_pkey;

alter table keyword_autocomplete_popularity
  add primary key (term, store, country);
