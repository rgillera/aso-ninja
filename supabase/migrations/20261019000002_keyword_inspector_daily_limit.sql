-- Keyword Inspector opens to every signed-in user, with a daily cap below
-- Pro (the limit itself lives in features/aso/keywords/inspector/limits.ts,
-- and app/api/keywords/inspect decides who it applies to).
--
-- One row per lookup: every inspection counts, including the same keyword
-- again and the onboarding tour's. Kept apart from
-- keyword_inspector_searches on purpose: that table is the user-deletable
-- Recent row (one row per keyword), and clearing Recent must not reset the
-- count.
--
-- Users can read their own rows but never write them. Every write goes
-- through the service-role functions below, called by the inspect route.

create table keyword_inspector_lookups (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- UTC day, so the allowance resets at 00:00 UTC for everyone.
  day         date not null default (now() at time zone 'utc')::date,
  term        text not null,
  store       text not null check (store in ('ios', 'android')),
  country     text not null,
  created_at  timestamptz not null default now()
);

create index keyword_inspector_lookups_user_day_idx
  on keyword_inspector_lookups (user_id, day);

alter table keyword_inspector_lookups enable row level security;

create policy "users read own inspector lookups"
  on keyword_inspector_lookups for select
  using (auth.uid() = user_id);

-- Uses one of the user's lookups for today. Returns:
--   allowed:   whether the inspection may run
--   lookup_id: the row just recorded (null when not allowed), so a failed
--              inspection can hand it back with refund_keyword_inspector_lookup
--   used:      lookups used today, after this call
-- Serialized per user with an advisory lock, so a burst of parallel requests
-- can't all slip in under the limit.
create or replace function consume_keyword_inspector_lookup(
  p_user_id uuid, p_term text, p_store text, p_country text, p_limit integer
) returns table (allowed boolean, lookup_id bigint, used integer)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_day  date := (now() at time zone 'utc')::date;
  v_used integer;
  v_id   bigint;
begin
  perform pg_advisory_xact_lock(hashtext('keyword_inspector_lookups:' || p_user_id::text));

  select count(*) into v_used
  from public.keyword_inspector_lookups l
  where l.user_id = p_user_id and l.day = v_day;

  if v_used >= p_limit then
    return query select false, null::bigint, v_used;
    return;
  end if;

  insert into public.keyword_inspector_lookups (user_id, day, term, store, country)
  values (p_user_id, v_day, p_term, p_store, p_country)
  returning id into v_id;

  return query select true, v_id, v_used + 1;
end;
$$;

-- Gives back a lookup consume_keyword_inspector_lookup just used, when the
-- inspection itself then failed (store busy, scoring error): a lookup the
-- user never got results for shouldn't count.
create or replace function refund_keyword_inspector_lookup(p_lookup_id bigint)
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.keyword_inspector_lookups where id = p_lookup_id;
$$;

revoke execute on function public.consume_keyword_inspector_lookup(uuid, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.refund_keyword_inspector_lookup(bigint) from public, anon, authenticated;
grant execute on function public.consume_keyword_inspector_lookup(uuid, text, text, text, integer) to service_role;
grant execute on function public.refund_keyword_inspector_lookup(bigint) to service_role;
