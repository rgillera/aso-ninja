-- Keyword Inspector search history (features/aso/keywords/inspector). Feeds
-- the page's "Recent" row, which used to live in each browser's localStorage:
-- that couldn't follow a user across devices, and an admin viewing as a user
-- saw their own browser's searches instead of the user's.
--
-- One row per user/term/store/country. Searching the same keyword again bumps
-- searched_at and search_count instead of adding a row, so "recent" is just
-- the newest rows and the counts show which keywords people keep coming back
-- to. Rows are written by app/api/keywords/inspect on every inspection.

create table keyword_inspector_searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- The workspace the search was made from. Informational only: the Recent
  -- row is per user, not per workspace.
  workspace_id  uuid references workspaces(id) on delete set null,
  term          text not null,
  store         text not null check (store in ('ios', 'android')),
  country       text not null,
  search_count  integer not null default 1,
  searched_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (user_id, term, store, country)
);

create index keyword_inspector_searches_user_recent_idx
  on keyword_inspector_searches (user_id, searched_at desc);

alter table keyword_inspector_searches enable row level security;

create policy "users read own inspector searches"
  on keyword_inspector_searches for select
  using (auth.uid() = user_id);

create policy "users insert own inspector searches"
  on keyword_inspector_searches for insert
  with check (auth.uid() = user_id);

create policy "users update own inspector searches"
  on keyword_inspector_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own inspector searches"
  on keyword_inspector_searches for delete
  using (auth.uid() = user_id);

-- Upsert that also increments search_count, which a plain PostgREST upsert
-- can't do (it would reset the count to whatever the client sent).
-- security invoker, so the RLS policies above still apply.
create or replace function record_keyword_inspector_search(
  p_term text, p_store text, p_country text, p_workspace_id uuid
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into keyword_inspector_searches (user_id, workspace_id, term, store, country)
  values (auth.uid(), p_workspace_id, p_term, p_store, p_country)
  on conflict (user_id, term, store, country) do update
    set search_count = keyword_inspector_searches.search_count + 1,
        searched_at  = now(),
        workspace_id = coalesce(excluded.workspace_id, keyword_inspector_searches.workspace_id);
$$;
