-- iOS keyword popularity estimated from App Store search autocomplete: how
-- few letters of the keyword have to be typed before Apple suggests it, and
-- how high it sits in that suggestion list (see libs/keyword-autocomplete.ts).
-- One row per term/country, refreshed at most weekly — each check costs up to
-- ~9 requests to Apple's hints endpoint, so this is cached separately from
-- the daily keyword_volume_history snapshot rather than recomputed per day.
--
-- prefix_chars/position are null when the keyword is never suggested, even
-- fully typed (score is then the floor value).
--
-- Global aggregated data, not user-owned — same public read/insert/update
-- policies as keyword_volume_history.

create table keyword_autocomplete_popularity (
  term          text not null,
  country       text not null,
  score         integer not null check (score between 0 and 100),
  prefix_chars  integer,
  position      integer,
  checked_at    timestamptz not null default now(),
  primary key (term, country)
);

alter table keyword_autocomplete_popularity enable row level security;

create policy "public read autocomplete popularity"
  on keyword_autocomplete_popularity for select
  using (true);

create policy "public insert autocomplete popularity"
  on keyword_autocomplete_popularity for insert
  with check (true);

create policy "public update autocomplete popularity"
  on keyword_autocomplete_popularity for update
  using (true)
  with check (true);
