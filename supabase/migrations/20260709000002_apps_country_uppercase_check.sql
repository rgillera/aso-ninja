-- Enforces at the DB level what followAppAction already does in application
-- code (uppercase country before writing). Without this, any future write
-- path that forgets to uppercase can silently reintroduce the duplicate-app
-- bug 20260704000009 and 20260709000001 cleaned up, since the unique
-- constraint on (workspace_id, store, bundle_id, country) is case-sensitive.
-- Fails loudly instead.

alter table apps add constraint apps_country_uppercase
  check (country is null or country = upper(country));
