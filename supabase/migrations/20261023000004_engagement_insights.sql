-- Super admin Engagement page (app/admin/engagement): active users, signup
-- retention, activation milestones, the upgrade funnel and paying users at
-- risk of churning.
--
-- user_events holds the moments nothing else records: finishing the product
-- tour (otherwise only in localStorage), starting a Stripe checkout, and
-- completing one. Apps, keywords, competitors and Inspector searches already
-- carry their own created_at, so milestones read those tables directly.
-- Written by libs/analytics/events.ts with the service role.
create table user_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  -- Optional dedupe key, e.g. the Stripe checkout session id: webhooks are
  -- retried, and a retry must not log a second completed checkout.
  ref        text,
  created_at timestamptz not null default now(),
  unique (name, ref)
);

create index user_events_user_name_idx on user_events (user_id, name, created_at);

-- Read and written only via the service role, so no policies.
alter table user_events enable row level security;

-- Users the stats should skip (the super admins, whose own clicking around
-- would otherwise count as engagement). Emails rather than ids because the
-- allowlist is SUPER_ADMIN_EMAILS.
create or replace function public.admin_excluded_user_ids(p_exclude_emails text[])
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = any (p_exclude_emails);
$$;

-- DAU / WAU / MAU, counted on UTC days (user_activity_days.day).
create or replace function public.admin_active_user_totals(p_exclude_emails text[] default '{}')
returns table (dau integer, wau integer, mau integer)
language sql stable security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'utc')::date as d),
  days as (
    select user_id, day
      from public.user_activity_days, today
     where day > today.d - 30
       and user_id not in (select public.admin_excluded_user_ids(p_exclude_emails))
  )
  select
    (select count(distinct user_id) from days, today where day = today.d)::int,
    (select count(distinct user_id) from days, today where day > today.d - 7)::int,
    (select count(distinct user_id) from days)::int;
$$;

-- Users active on each of the last p_days UTC days, zero-filled.
create or replace function public.admin_daily_active_users(p_days integer default 30, p_exclude_emails text[] default '{}')
returns table (day date, users integer)
language sql stable security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'utc')::date as d)
  select s.day::date, count(a.user_id)::int
    from today,
         generate_series(today.d - (p_days - 1), today.d, interval '1 day') as s(day)
    left join public.user_activity_days a
      on a.day = s.day::date
     and a.user_id not in (select public.admin_excluded_user_ids(p_exclude_emails))
   group by s.day
   order by s.day;
$$;

-- Weekly signup cohorts (Monday-start, UTC) and how many came back:
--   day 1  = active the day after signing up
--   week 1 = active on any of days 1-7
--   week 4 = active on any of days 22-28
-- Each rate only counts users whose window has fully passed (the *_eligible
-- columns), so a cohort still in progress isn't shown as having churned.
create or replace function public.admin_retention_cohorts(p_weeks integer default 8, p_exclude_emails text[] default '{}')
returns table (
  cohort_week  date,
  users        integer,
  d1_eligible  integer,
  d1           integer,
  w1_eligible  integer,
  w1           integer,
  w4_eligible  integer,
  w4           integer
)
language sql stable security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'utc')::date as d),
  signups as (
    select u.id,
           (u.created_at at time zone 'utc')::date as signup_day,
           date_trunc('week', u.created_at at time zone 'utc')::date as cohort_week
      from auth.users u, today
     where u.created_at at time zone 'utc' >= date_trunc('week', today.d) - (p_weeks - 1) * interval '1 week'
       and u.id not in (select public.admin_excluded_user_ids(p_exclude_emails))
  ),
  per_user as (
    select s.cohort_week,
           s.signup_day + 1  < t.d as d1_ok,
           s.signup_day + 7  < t.d as w1_ok,
           s.signup_day + 28 < t.d as w4_ok,
           exists (select 1 from public.user_activity_days a
                    where a.user_id = s.id and a.day = s.signup_day + 1) as d1_hit,
           exists (select 1 from public.user_activity_days a
                    where a.user_id = s.id and a.day between s.signup_day + 1 and s.signup_day + 7) as w1_hit,
           exists (select 1 from public.user_activity_days a
                    where a.user_id = s.id and a.day between s.signup_day + 22 and s.signup_day + 28) as w4_hit
      from signups s, today t
  )
  select cohort_week,
         count(*)::int,
         count(*) filter (where d1_ok)::int,
         count(*) filter (where d1_ok and d1_hit)::int,
         count(*) filter (where w1_ok)::int,
         count(*) filter (where w1_ok and w1_hit)::int,
         count(*) filter (where w4_ok)::int,
         count(*) filter (where w4_ok and w4_hit)::int
    from per_user
   group by cohort_week
   order by cohort_week desc;
$$;

-- One row per user with the first time they reached each activation step,
-- plus the upgrade funnel. Apps/keywords/competitors are workspace-scoped and
-- roll up through the workspaces the user owns (same ownership model as the
-- admin Users table). paid_at falls back to the subscription row for anyone
-- who paid before checkout_completed events existed.
create or replace function public.admin_user_milestones()
returns table (
  user_id             uuid,
  email               text,
  created_at          timestamptz,
  first_app_at        timestamptz,
  first_keyword_at    timestamptz,
  first_competitor_at timestamptz,
  first_inspect_at    timestamptz,
  tour_completed_at   timestamptz,
  pricing_views       integer,
  first_checkout_at   timestamptz,
  last_checkout_at    timestamptz,
  last_checkout_plan  text,
  paid_at             timestamptz,
  plan_slug           text
)
language sql stable security definer
set search_path = ''
as $$
  with owned as (
    select user_id, workspace_id from public.workspace_members where role = 'owner'
  ),
  apps_first as (
    select o.user_id, min(a.created_at) as at
      from owned o join public.apps a on a.workspace_id = o.workspace_id
     group by o.user_id
  ),
  keywords_first as (
    select o.user_id, min(k.created_at) as at
      from owned o join public.keywords k on k.workspace_id = o.workspace_id
     group by o.user_id
  ),
  competitors_first as (
    select o.user_id, min(c.created_at) as at
      from owned o
      join public.apps a on a.workspace_id = o.workspace_id
      join public.app_competitors c on c.app_id = a.id
     group by o.user_id
  ),
  inspect_first as (
    select user_id, min(created_at) as at from public.keyword_inspector_searches group by user_id
  ),
  events as (
    select user_id,
           min(created_at) filter (where name = 'tour_completed')     as tour_at,
           min(created_at) filter (where name = 'checkout_started')   as checkout_first,
           max(created_at) filter (where name = 'checkout_started')   as checkout_last,
           min(created_at) filter (where name = 'checkout_completed') as paid_at
      from public.user_events
     group by user_id
  ),
  last_checkout as (
    select distinct on (user_id) user_id, props ->> 'plan' as plan
      from public.user_events
     where name = 'checkout_started'
     order by user_id, created_at desc
  ),
  current_plan as (
    select s.user_id, p.slug, s.created_at
      from public.subscriptions s join public.plans p on p.id = s.plan_id
     where s.status in ('active', 'trialing')
  )
  select u.id,
         u.email::text,
         u.created_at,
         af.at,
         kf.at,
         cf.at,
         inf.at,
         e.tour_at,
         coalesce(ua.subscription_page_views, 0),
         e.checkout_first,
         e.checkout_last,
         lc.plan,
         coalesce(e.paid_at, case when cp.slug <> 'free' then cp.created_at end),
         coalesce(cp.slug, 'free')
    from auth.users u
    left join apps_first af        on af.user_id = u.id
    left join keywords_first kf    on kf.user_id = u.id
    left join competitors_first cf on cf.user_id = u.id
    left join inspect_first inf    on inf.user_id = u.id
    left join events e             on e.user_id = u.id
    left join last_checkout lc     on lc.user_id = u.id
    left join current_plan cp      on cp.user_id = u.id
    left join public.user_activity ua on ua.user_id = u.id;
$$;

-- Every paying user with their visits over the last 14 UTC days against the
-- 14 before that. The page decides who is at risk (see AdminEngagementPage).
create or replace function public.admin_paying_user_engagement()
returns table (
  user_id              uuid,
  email                text,
  plan_name            text,
  status               text,
  current_period_end   timestamptz,
  cancel_at_period_end boolean,
  last_active_at       timestamptz,
  visits_last_14       integer,
  visits_prev_14       integer,
  active_days_last_14  integer
)
language sql stable security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'utc')::date as d)
  select s.user_id,
         u.email::text,
         p.name,
         s.status::text,
         s.current_period_end,
         s.cancel_at_period_end,
         ua.last_active_at,
         coalesce(sum(a.visits) filter (where a.day > t.d - 14), 0)::int,
         coalesce(sum(a.visits) filter (where a.day <= t.d - 14 and a.day > t.d - 28), 0)::int,
         count(a.day) filter (where a.day > t.d - 14)::int
    from today t
    join public.subscriptions s on s.status in ('active', 'trialing')
    join public.plans p on p.id = s.plan_id and p.slug <> 'free'
    join auth.users u on u.id = s.user_id
    left join public.user_activity ua on ua.user_id = s.user_id
    left join public.user_activity_days a on a.user_id = s.user_id and a.day > t.d - 28
   group by s.user_id, u.email, p.name, s.status, s.current_period_end, s.cancel_at_period_end, ua.last_active_at;
$$;

-- Functions in public are executable by anon/authenticated by default; these
-- read every user's data, so only the service role (the admin pages) may call
-- them.
revoke execute on function public.admin_excluded_user_ids(text[]) from public, anon, authenticated;
revoke execute on function public.admin_active_user_totals(text[]) from public, anon, authenticated;
revoke execute on function public.admin_daily_active_users(integer, text[]) from public, anon, authenticated;
revoke execute on function public.admin_retention_cohorts(integer, text[]) from public, anon, authenticated;
revoke execute on function public.admin_user_milestones() from public, anon, authenticated;
revoke execute on function public.admin_paying_user_engagement() from public, anon, authenticated;
grant execute on function public.admin_excluded_user_ids(text[]) to service_role;
grant execute on function public.admin_active_user_totals(text[]) to service_role;
grant execute on function public.admin_daily_active_users(integer, text[]) to service_role;
grant execute on function public.admin_retention_cohorts(integer, text[]) to service_role;
grant execute on function public.admin_user_milestones() to service_role;
grant execute on function public.admin_paying_user_engagement() to service_role;
