-- "Visits" and "Days active" for the super admin Users table: how often
-- someone comes back, not just how long they stay ("Time used").
--
-- A visit starts on the first heartbeat after 30+ minutes without one (the
-- usual web-analytics session timeout), so leaving a tab open all day is one
-- visit while closing the app and returning after lunch is two.
--
-- user_activity_days keeps one row per user per UTC day so retention
-- (D1/D7/D30), DAU/WAU and per-day usage can be computed later; that history
-- can't be rebuilt after the fact, so it starts collecting now.
alter table user_activity
  add column visit_count integer not null default 0,
  add column active_days integer not null default 0;

-- Rows from before this migration: whoever has used the app visited at least
-- once on at least one day. Real counts accumulate from here.
update user_activity
   set visit_count = 1,
       active_days = 1
 where active_seconds > 0;

create table user_activity_days (
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null,
  active_seconds integer not null default 0,
  visits         integer not null default 0,
  primary key (user_id, day)
);

-- Read only via the service role, like user_activity.
alter table user_activity_days enable row level security;

create or replace function public.record_user_activity()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_now   timestamptz := now();
  v_today date := (now() at time zone 'utc')::date;
  v_prev  timestamptz;
  v_new_visit boolean;
  v_new_day   boolean;
begin
  if v_user is null then
    return;
  end if;

  -- Locked so two tabs pinging at once can't both see the old timestamp and
  -- double count.
  select last_active_at into v_prev
    from public.user_activity
   where user_id = v_user
   for update;

  -- Pings closer than 50s to the previous one are dropped, so several open
  -- tabs don't multiply the count (and a client can't inflate it by pinging
  -- faster).
  if v_prev is not null and v_prev >= v_now - interval '50 seconds' then
    return;
  end if;

  v_new_visit := v_prev is null or v_prev < v_now - interval '30 minutes';
  v_new_day   := v_prev is null or (v_prev at time zone 'utc')::date < v_today;

  insert into public.user_activity as ua (user_id, active_seconds, last_active_at, visit_count, active_days)
  values (v_user, 60, v_now, 1, 1)
  on conflict (user_id) do update
     set active_seconds = ua.active_seconds + 60,
         last_active_at = v_now,
         visit_count    = ua.visit_count + v_new_visit::int,
         active_days    = ua.active_days + v_new_day::int;

  -- A visit that runs past midnight UTC still opens the new day's row, so
  -- each day with usage has at least one visit.
  insert into public.user_activity_days as d (user_id, day, active_seconds, visits)
  values (v_user, v_today, 60, 1)
  on conflict (user_id, day) do update
     set active_seconds = d.active_seconds + 60,
         visits         = d.visits + v_new_visit::int;
end;
$$;

-- A first-ever pricing page view creates the user_activity row, and since
-- its last_active_at would then suppress the heartbeat right behind it,
-- count that first open as the visit/day instead.
create or replace function public.record_subscription_page_view()
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

  -- An existing row's last_active_at/active_seconds are left alone: opening
  -- the page isn't a minute of use (ActivityHeartbeat counts that).
  insert into public.user_activity as ua (user_id, subscription_page_views, last_active_at, visit_count, active_days)
  values (v_user, 1, now(), 1, 1)
  on conflict (user_id) do update
     set subscription_page_views = ua.subscription_page_views + 1;
end;
$$;
