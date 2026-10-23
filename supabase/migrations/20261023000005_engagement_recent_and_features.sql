-- Engagement page follow-ups: more features in the "New signups" table and a
-- "Recently active" list.
--
-- admin_user_milestones gains the first time each user touched the other
-- features that leave a row behind. All are user-initiated: intent themes
-- are left out since keyword metrics can create them automatically.
-- Workspace-scoped features roll up through owned workspaces, like apps and
-- keywords already do.
drop function public.admin_user_milestones();

create function public.admin_user_milestones()
returns table (
  user_id               uuid,
  email                 text,
  created_at            timestamptz,
  first_app_at          timestamptz,
  first_keyword_at      timestamptz,
  first_competitor_at   timestamptz,
  first_inspect_at      timestamptz,
  tour_completed_at     timestamptz,
  pricing_views         integer,
  first_checkout_at     timestamptz,
  last_checkout_at      timestamptz,
  last_checkout_plan    text,
  paid_at               timestamptz,
  plan_slug             text,
  first_combination_at  timestamptz,
  first_ai_prompt_at    timestamptz,
  first_store_link_at   timestamptz,
  first_asa_link_at     timestamptz,
  first_invite_at       timestamptz,
  first_push_at         timestamptz,
  first_certification_at timestamptz
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
  combinations_first as (
    select o.user_id, min(g.created_at) as at
      from owned o
      join public.apps a on a.workspace_id = o.workspace_id
      join public.keyword_combination_groups g on g.app_id = a.id
     group by o.user_id
  ),
  ai_prompts_first as (
    select o.user_id, min(p.created_at) as at
      from owned o join public.ai_visibility_prompts p on p.workspace_id = o.workspace_id
     group by o.user_id
  ),
  -- App Store Connect / Play Console sales data: credentials per workspace,
  -- plus the older per-app connections.
  store_links_first as (
    select user_id, min(at) as at from (
      select o.user_id, c.created_at as at
        from owned o join public.app_store_credentials c on c.workspace_id = o.workspace_id
      union all
      select o.user_id, c.created_at
        from owned o
        join public.apps a on a.workspace_id = o.workspace_id
        join public.app_store_connections c on c.app_id = a.id
    ) s
     group by user_id
  ),
  asa_first as (
    select o.user_id, min(c.created_at) as at
      from owned o join public.asa_connections c on c.workspace_id = o.workspace_id
     group by o.user_id
  ),
  invites_first as (
    select invited_by as user_id, min(created_at) as at
      from public.workspace_invites
     where invited_by is not null
     group by invited_by
  ),
  push_first as (
    select user_id, min(created_at) as at from public.push_subscriptions group by user_id
  ),
  certification_first as (
    select user_id, min(started_at) as at from public.certification_attempts group by user_id
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
         coalesce(cp.slug, 'free'),
         comb.at,
         aip.at,
         sl.at,
         asa.at,
         inv.at,
         pu.at,
         cert.at
    from auth.users u
    left join apps_first af           on af.user_id = u.id
    left join keywords_first kf       on kf.user_id = u.id
    left join competitors_first cf    on cf.user_id = u.id
    left join inspect_first inf       on inf.user_id = u.id
    left join combinations_first comb on comb.user_id = u.id
    left join ai_prompts_first aip    on aip.user_id = u.id
    left join store_links_first sl    on sl.user_id = u.id
    left join asa_first asa           on asa.user_id = u.id
    left join invites_first inv       on inv.user_id = u.id
    left join push_first pu           on pu.user_id = u.id
    left join certification_first cert on cert.user_id = u.id
    left join events e                on e.user_id = u.id
    left join last_checkout lc        on lc.user_id = u.id
    left join current_plan cp         on cp.user_id = u.id
    left join public.user_activity ua on ua.user_id = u.id;
$$;

-- Users seen in the last p_days, most recent first, with their last-7-day
-- usage next to all-time totals.
create or replace function public.admin_recent_active_users(p_days integer default 7, p_exclude_emails text[] default '{}')
returns table (
  user_id             uuid,
  email               text,
  created_at          timestamptz,
  plan_slug           text,
  plan_name           text,
  last_active_at      timestamptz,
  visits_7d           integer,
  active_days_7d      integer,
  active_seconds_7d   integer,
  visit_count         integer,
  active_seconds      integer
)
language sql stable security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'utc')::date as d)
  select ua.user_id,
         u.email::text,
         u.created_at,
         coalesce(p.slug, 'free'),
         p.name,
         ua.last_active_at,
         coalesce(sum(a.visits), 0)::int,
         count(a.day)::int,
         coalesce(sum(a.active_seconds), 0)::int,
         ua.visit_count,
         ua.active_seconds
    from today t
    join public.user_activity ua on ua.last_active_at > now() - make_interval(days => p_days)
    join auth.users u on u.id = ua.user_id
    left join public.subscriptions s on s.user_id = ua.user_id and s.status in ('active', 'trialing')
    left join public.plans p on p.id = s.plan_id
    left join public.user_activity_days a on a.user_id = ua.user_id and a.day > t.d - 7
   -- coalesce: a user without an email would otherwise compare as null and drop out.
   where coalesce(lower(u.email), '') <> all (p_exclude_emails)
   group by ua.user_id, u.email, u.created_at, p.slug, p.name, ua.last_active_at, ua.visit_count, ua.active_seconds
   order by ua.last_active_at desc;
$$;

revoke execute on function public.admin_user_milestones() from public, anon, authenticated;
revoke execute on function public.admin_recent_active_users(integer, text[]) from public, anon, authenticated;
grant execute on function public.admin_user_milestones() to service_role;
grant execute on function public.admin_recent_active_users(integer, text[]) to service_role;
