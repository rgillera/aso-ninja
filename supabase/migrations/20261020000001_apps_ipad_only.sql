-- iPad-only apps never appear in Apple's entity=software (iPhone) search, so
-- their keyword ranks come from a separate entity=iPadSoftware search. null =
-- not checked yet; resolved lazily from the iTunes lookup's supportedDevices
-- the first time the app's keyword metrics load (see libs/store/ipad-only.ts).
alter table public.apps add column ipad_only boolean;
