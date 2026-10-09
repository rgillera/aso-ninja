-- Per-user app usage for the super admin Users table: "Time used" and
-- "Last active". auth.users.last_sign_in_at only moves on an actual sign-in
-- (sessions refresh silently for weeks), so it can't say whether someone is
-- still using the app. Fed by ActivityHeartbeat (features/activity), which
-- pings record_user_activity() once a minute while a signed-in tab is
-- visible and the user has interacted recently.
create table user_activity (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  active_seconds integer not null default 0,
  last_active_at timestamptz not null default now()
);

-- Read only via the service role (admin Users page); writes go through the
-- function below, so no policies.
alter table user_activity enable row level security;

-- Each accepted ping counts as one minute of use. Pings closer than 50s to
-- the previous one are dropped, so several open tabs don't multiply the
-- count (and a client can't inflate it by pinging faster).
create or replace function public.record_user_activity()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  insert into public.user_activity as ua (user_id, active_seconds, last_active_at)
  values (v_user, 60, now())
  on conflict (user_id) do update
     set active_seconds = ua.active_seconds + 60,
         last_active_at = now()
   where ua.last_active_at < now() - interval '50 seconds';
end;
$$;

revoke execute on function public.record_user_activity() from public, anon;
grant execute on function public.record_user_activity() to authenticated;
