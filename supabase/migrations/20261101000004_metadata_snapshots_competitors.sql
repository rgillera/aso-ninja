-- Timeline now shows competitors too, so their listings get daily snapshots
-- alongside followed apps. A competitor has no store/country of its own; it
-- uses its app's, like everywhere else competitors are shown.
--
-- Snapshots are keyed by store_id AND bundle_id, and competitors were saved
-- with a store_id only. On Android the two are the same package name. On iOS
-- the bundle id comes from the App Store lookup: the refresh-metadata cron
-- fills it in after the first fetch, so a competitor's history is the same
-- rows a workspace following that app records and reads.
alter table public.app_competitors add column bundle_id text;

-- Return type gains competitor_id (null for a followed app), so the function
-- has to be dropped rather than replaced.
drop function public.stale_metadata_apps(date, int);

create function public.stale_metadata_apps(p_today date, p_limit int default 200)
returns table(id uuid, workspace_id uuid, store text, bundle_id text, store_id text, country text, competitor_id uuid)
language sql security definer set search_path = ''
as $$
  with listings as (
    select a.id, a.workspace_id, a.store,
      coalesce(a.store_id, '') as store_id, coalesce(a.bundle_id, '') as bundle_id,
      coalesce(a.country, 'US') as country, null::uuid as competitor_id
    from public.apps a
    union all
    select a.id, a.workspace_id, a.store,
      c.store_id, case when a.store = 'android' then c.store_id else coalesce(c.bundle_id, '') end,
      coalesce(a.country, 'US'), c.id
    from public.app_competitors c
    join public.apps a on a.id = c.app_id
  )
  select id, workspace_id, store::text, bundle_id, store_id, country, competitor_id
  from (
    -- One row per listing; a followed app wins over the same listing as a
    -- competitor (competitor_id nulls first).
    select distinct on (l.store, l.country, l.store_id, l.bundle_id)
      l.*,
      (
        select max(ms2.recorded_on) from public.metadata_snapshots ms2
        where ms2.store = l.store and ms2.country = l.country
          and ms2.store_id = l.store_id and ms2.bundle_id = l.bundle_id
      ) as last_recorded
    from listings l
    where not exists (
      select 1 from public.metadata_snapshots ms
      where ms.store = l.store and ms.country = l.country
        and ms.store_id = l.store_id and ms.bundle_id = l.bundle_id
        and ms.recorded_on = p_today
    )
    and (public.get_workspace_plan(l.workspace_id)).sort_order >= (
      select sort_order from public.plans where slug = 'pro'
    )
    order by l.store, l.country, l.store_id, l.bundle_id, l.competitor_id nulls first
  ) dedup
  order by last_recorded asc nulls first
  limit p_limit;
$$;
