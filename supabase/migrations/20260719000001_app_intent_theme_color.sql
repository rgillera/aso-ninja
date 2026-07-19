-- Lets a user override an intent theme's swatch (index into the client-side
-- THEME_COLORS palette). Null means "auto" — the client falls back to
-- cycling colors by the theme's position, same as before this column existed.
alter table app_intent_themes
  add column color_index smallint;
