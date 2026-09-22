-- Caches /api/ai-visibility/suggest-prompts' Gemini result per real app per
-- day. Without this, every page visit for an app fired a fresh Gemini call
-- regardless of whether anything changed — unlike the visibility checks
-- (ai_visibility_answers), which were already deduped this way.
--
-- Keyed by app_key (a single "<store>|<storeId-or-bundleId>|<country>"
-- string computed at the API layer) rather than separate nullable
-- store_id/bundle_id columns — the same real app looks identical across
-- every workspace tracking it, so this cache is intentionally global, not
-- scoped to a workspace, the same "keyed by the real thing, not the
-- workspace-scoped row" sharing ai_visibility_answers already uses for
-- prompt text.
create table ai_visibility_suggestion_cache (
  id          uuid primary key default gen_random_uuid(),
  app_key     text not null,
  checked_on  date not null default current_date,
  placeholder text not null,
  suggestions jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (app_key, checked_on)
);

create index ai_visibility_suggestion_cache_lookup_idx on ai_visibility_suggestion_cache (app_key, checked_on desc);

-- Purely internal cache, never read by client code directly — same
-- no-policies-at-all treatment as ai_visibility_answers (service-role only).
alter table ai_visibility_suggestion_cache enable row level security;
