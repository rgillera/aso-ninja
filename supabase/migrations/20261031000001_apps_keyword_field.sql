-- The iOS keyword field (100 characters, comma separated). Apple never
-- publishes it, so it can't be fetched like the title and subtitle; the user
-- pastes their live one into the Keyword Simulator, which saves it here so
-- its "Now" column counts it. null = never entered.
alter table public.apps add column keyword_field text;
