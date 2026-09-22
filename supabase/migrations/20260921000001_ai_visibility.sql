-- AI Visibility: tracked discovery-style prompts (workspace-scoped, mirrors
-- keywords/app_keywords) plus a daily check of whether a tracked app gets
-- mentioned when that prompt is put to an AI model.
--
-- No store/country dimension, unlike keywords: Gemini isn't a per-storefront
-- search index, and the product concept ("how do I show up in AI search")
-- has no natural App Store vs. Play Store vs. country split the way a real
-- search-rank scrape does. If country-flavored prompts ("best budgeting app
-- in Germany") become a real ask, that's a column to add later, not now.

create table ai_visibility_prompts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prompt       text not null,       -- normalized (trim, collapsed whitespace) at the API layer, same convention as keywords.term
  created_at   timestamptz not null default now(),
  unique (workspace_id, prompt)
);

create index ai_visibility_prompts_workspace_id_idx on ai_visibility_prompts (workspace_id);

create table app_ai_visibility_prompts (
  id         uuid primary key default gen_random_uuid(),
  app_id     uuid not null references apps(id) on delete cascade,
  prompt_id  uuid not null references ai_visibility_prompts(id) on delete cascade,
  added_at   timestamptz not null default now(),
  unique (app_id, prompt_id)
);

create index app_ai_visibility_prompts_app_id_idx on app_ai_visibility_prompts (app_id);
create index app_ai_visibility_prompts_prompt_id_idx on app_ai_visibility_prompts (prompt_id);

alter table ai_visibility_prompts enable row level security;
alter table app_ai_visibility_prompts enable row level security;

create policy "workspace members can read ai visibility prompts"
  on ai_visibility_prompts for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace admins and owners can manage ai visibility prompts"
  on ai_visibility_prompts for all
  using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

create policy "workspace members can read app ai visibility prompts"
  on app_ai_visibility_prompts for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace admins/owners can manage app ai visibility prompts"
  on app_ai_visibility_prompts for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  ));

-- Shared, prompt-text-keyed raw model answer — the actual Gemini call,
-- fetched at most once per (prompt, provider, day) and reused by every
-- workspace/app tracking that exact prompt text. Same "keyed by the raw
-- text, not a workspace-scoped row id" shape keyword_rankings_history uses,
-- and for the same reason: ai_visibility_prompts is workspace-scoped, but
-- the model's answer doesn't depend on who's asking.
create table ai_visibility_answers (
  id             uuid primary key default gen_random_uuid(),
  prompt         text not null,
  provider       text not null default 'gemini',
  checked_on     date not null default current_date,
  -- Ordered as the model presented them: [{ "name": "...", "position": 1, "reason": "..." }, ...].
  -- [] when the answer didn't enumerate specific apps at all.
  mentioned_apps jsonb not null default '[]'::jsonb,
  raw_answer     text,             -- the model's plain-prose narrative, kept for snippet fallback + audit
  created_at     timestamptz not null default now(),
  unique (prompt, provider, checked_on)
);

create index ai_visibility_answers_lookup_idx on ai_visibility_answers (prompt, provider, checked_on desc);

-- Purely internal cron/derivation state, never queried by a client-facing
-- route (the UI only ever reads ai_visibility_checks below) — no policies
-- at all, so anon/authenticated get nothing; only the refresh-ai-visibility
-- cron and the check-now route (both service role, bypass RLS) touch it.
-- Same convention as keyword_refresh_failures.
alter table ai_visibility_answers enable row level security;

-- Per (app, prompt) daily result — what the UI actually reads. Derived by
-- matching this app's name against that day's shared ai_visibility_answers
-- row for the same prompt text (see above for why the model call itself is
-- shared instead of one-call-per-app).
--
-- Unique on (app_id, prompt_id, checked_on) — NOT also on position, unlike
-- keyword_rankings_history (which uniques across every position on a page
-- because it stores the whole ranked page as one row per rank). A mention
-- check has exactly one outcome per app per prompt per day, so a same-day
-- re-run (a manual "Check now", or the cron catching up) overwrites in
-- place rather than accumulating duplicate rows for the same day.
create table ai_visibility_checks (
  id              uuid primary key default gen_random_uuid(),
  app_id          uuid not null references apps(id) on delete cascade,
  prompt_id       uuid not null references ai_visibility_prompts(id) on delete cascade,
  provider        text not null default 'gemini',
  checked_on      date not null default current_date,
  mentioned       boolean not null,
  -- Rank in the AI's enumerated list; null when not mentioned OR when the
  -- answer never enumerated a list at all — a "checked, not found" marker,
  -- not an absent row.
  position        integer,
  -- Other apps the answer mentioned, this app excluded: [{ "name", "position", "reason"? }, ...]
  competitor_apps jsonb not null default '[]'::jsonb,
  snippet         text,          -- short reasoning/excerpt relevant to this app
  created_at      timestamptz not null default now(),
  unique (app_id, prompt_id, checked_on)
);

create index ai_visibility_checks_lookup_idx on ai_visibility_checks (app_id, prompt_id, checked_on desc);

alter table ai_visibility_checks enable row level security;

-- Unlike keyword_rankings_history, app_id here IS a real FK into this
-- workspace's own apps table (not an arbitrary external store id for
-- whichever app happened to appear on a shared search results page) — so
-- this uses the same workspace-membership RLS as keyword_metrics, not the
-- permissive "using (true)" reserved for tables whose app_id isn't a real FK.
create policy "workspace members can read ai visibility checks"
  on ai_visibility_checks for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members can upsert ai visibility checks"
  on ai_visibility_checks for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

-- Finds every unique tracked prompt (across all workspaces) that hasn't had
-- a Gemini answer fetched yet today, prioritizing prompts with the most
-- trackers first — a shared-across-many prompt clearing the daily batch is
-- worth more (frees more workspaces' checks) than a niche one. Mirrors
-- stale_keywords_for_refresh's shape.
create or replace function public.stale_ai_visibility_prompts_for_refresh(p_limit int default 25)
returns table(prompt text)
language sql security definer
set search_path = ''
as $$
  with tracked as (
    select p.prompt, count(*) as trackers
    from public.ai_visibility_prompts p
    join public.app_ai_visibility_prompts ap on ap.prompt_id = p.id
    group by p.prompt
  ),
  checked_today as (
    select distinct a.prompt
    from public.ai_visibility_answers a
    where a.provider = 'gemini' and a.checked_on = current_date
  )
  select t.prompt
  from tracked t
  left join checked_today c on c.prompt = t.prompt
  where c.prompt is null
  order by t.trackers desc, t.prompt asc
  limit p_limit;
$$;

grant execute on function public.stale_ai_visibility_prompts_for_refresh(int) to service_role;
