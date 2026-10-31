-- The keyword limit counted rows in `keywords`, which is unique per
-- (workspace_id, term), so a term tracked on two apps counted once. The
-- subscription page then showed "Keywords 16 / 100" next to "Keywords
-- scored 32 / 40" for a user tracking the same 16 keywords on 2 apps, since
-- relevancy scores (keyword_metrics) are per app.
--
-- Now every tracked keyword counts per app: the limit, the pausing after a
-- downgrade and get_workspace_usage all count app_keywords links instead.
--
-- * app_keywords.status takes over from keywords.status as what gets frozen,
--   so a term can be paused on one app and still active on another.
-- * keywords.status is kept, derived: 'active' while any app still tracks
--   the term actively. The refresh cron reads it as a cheap first filter.
-- * enforce_keyword_limit moves from inserts on keywords to inserts on
--   app_keywords, since inserting the shared keyword row no longer adds to
--   the count.
-- * Removing a keyword from one app (an app_keywords delete that leaves the
--   keyword row in place) now frees a slot too, so it reconciles.

alter table app_keywords
  add column status text not null default 'active' check (status in ('active', 'frozen'));

create index on app_keywords (app_id, status);

-- Oldest link first, the same first-come order the keyword-row version used.
create or replace function reconcile_keyword_limits(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  v_plan := public.get_effective_plan(p_user_id);

  with ranked as (
    select ak.id, row_number() over (order by ak.added_at asc, ak.id asc) as rn
    from public.app_keywords ak
    join public.apps a on a.id = ak.app_id
    join public.workspace_members wm on wm.workspace_id = a.workspace_id and wm.role = 'owner'
    where wm.user_id = p_user_id
  ),
  desired as (
    select id, case when v_plan.keyword_limit is null or rn <= v_plan.keyword_limit
                     then 'active' else 'frozen' end as status
    from ranked
  )
  update public.app_keywords ak
  set status = desired.status
  from desired
  where desired.id = ak.id and ak.status is distinct from desired.status;

  update public.keywords k
  set status = case
    when exists (select 1 from public.app_keywords ak where ak.keyword_id = k.id and ak.status = 'active')
    then 'active' else 'frozen' end
  from public.workspace_members wm
  where wm.workspace_id = k.workspace_id and wm.role = 'owner' and wm.user_id = p_user_id
    and k.status is distinct from case
      when exists (select 1 from public.app_keywords ak where ak.keyword_id = k.id and ak.status = 'active')
      then 'active' else 'frozen' end;
end;
$$;

drop trigger if exists trg_enforce_keyword_limit on keywords;

-- Same checks as before (paused workspace, advisory lock against concurrent
-- saves), now counting the owner's active app_keywords links.
create or replace function enforce_keyword_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_owner        uuid;
  v_plan         public.plans;
  v_count        integer;
begin
  for v_workspace_id in
    select distinct a.workspace_id from inserted_app_keywords i join public.apps a on a.id = i.app_id
  loop
    if (select status from public.workspaces where id = v_workspace_id) = 'frozen' then
      raise exception 'This workspace is paused because it exceeds your plan''s workspace limit. Upgrade to restore access.';
    end if;

    v_owner := public.get_workspace_owner(v_workspace_id);
    if v_owner is null then
      continue;
    end if;

    v_plan := public.get_effective_plan(v_owner);

    if v_plan.keyword_limit is not null then
      perform pg_advisory_xact_lock(hashtext('keyword_limit:' || v_owner::text));

      select count(*) filter (where ak.status = 'active') into v_count
      from public.app_keywords ak
      join public.apps a on a.id = ak.app_id
      join public.workspace_members wm on wm.workspace_id = a.workspace_id and wm.role = 'owner'
      where wm.user_id = v_owner;

      if v_count > v_plan.keyword_limit then
        raise exception 'Keyword limit reached for your plan (% keywords across your apps). Upgrade to track more.', v_plan.keyword_limit;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

create trigger trg_enforce_keyword_limit
  after insert on app_keywords
  referencing new table as inserted_app_keywords
  for each statement
  execute function enforce_keyword_limit();

-- Removing a keyword from one app while another still tracks it leaves the
-- keyword row alone, so trg_reconcile_after_keyword_delete never fired for
-- it. The workspace comes from the app, or from the keyword when the app
-- itself was deleted (cascade); when both are gone the keyword-row delete
-- trigger has already reconciled.
create or replace function reconcile_after_app_keyword_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_owner        uuid;
begin
  for v_workspace_id in
    select a.workspace_id from deleted_app_keywords d join public.apps a on a.id = d.app_id
    union
    select k.workspace_id from deleted_app_keywords d join public.keywords k on k.id = d.keyword_id
  loop
    v_owner := public.get_workspace_owner(v_workspace_id);
    if v_owner is not null then
      perform public.reconcile_keyword_limits(v_owner);
      perform public.reconcile_relevancy_limits(v_owner);
    end if;
  end loop;
  return null;
end;
$$;

create trigger trg_reconcile_after_app_keyword_delete
  after delete on app_keywords
  referencing old table as deleted_app_keywords
  for each statement
  execute function reconcile_after_app_keyword_delete();

-- Same as 20261024000003, with the keyword counts taken from app_keywords.
create or replace function get_workspace_usage(p_workspace_id uuid)
returns table (
  keyword_count          integer,
  keyword_active_count   integer,
  keyword_frozen_count   integer,
  keyword_limit          integer,
  app_count              integer,
  app_active_count       integer,
  app_frozen_count       integer,
  app_limit              integer,
  member_count           integer,
  member_active_count    integer,
  member_frozen_count    integer,
  member_limit           integer,
  workspace_count        integer,
  workspace_limit        integer,
  relevancy_scored_count integer,
  relevancy_limit        integer,
  relevancy_frozen_count integer
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_plan  public.plans;
begin
  v_owner := public.get_workspace_owner(p_workspace_id);
  v_plan  := public.get_effective_plan(v_owner);

  return query
  with owned_links as (
    select ak.status from public.app_keywords ak
    join public.apps a on a.id = ak.app_id
    join public.workspace_members wm on wm.workspace_id = a.workspace_id and wm.role = 'owner'
    where wm.user_id = v_owner
  )
  select
    (select count(*)::integer from owned_links),
    (select count(*) filter (where status = 'active')::integer from owned_links),
    (select count(*) filter (where status = 'frozen')::integer from owned_links),
    v_plan.keyword_limit,
    (select count(*)::integer from public.apps where workspace_id = p_workspace_id),
    (select count(*) filter (where status = 'active')::integer from public.apps where workspace_id = p_workspace_id),
    (select count(*) filter (where status = 'frozen')::integer from public.apps where workspace_id = p_workspace_id),
    v_plan.app_limit,
    (select count(*)::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    (select count(*) filter (where status = 'active')::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    (select count(*) filter (where status = 'frozen')::integer from public.workspace_members
       where workspace_id = p_workspace_id and role <> 'owner'),
    v_plan.member_limit,
    (select count(*)::integer from public.workspace_members where user_id = v_owner and role = 'owner'),
    v_plan.workspace_limit,
    (select count(*)::integer from public.keyword_metrics km
       join public.keywords k on k.id = km.keyword_id
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner and km.relevancy_scored),
    v_plan.relevancy_limit,
    (select count(*)::integer from public.keyword_metrics km
       join public.keywords k on k.id = km.keyword_id
       join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
       where wm.user_id = v_owner and km.relevancy_scored and km.relevancy_frozen);
end;
$$;

-- Backfill: re-rank everyone under the per-app count. Owners whose links
-- across apps now exceed their plan get the newest ones paused, the same
-- as after a downgrade.
do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from workspace_members where role = 'owner' loop
    perform reconcile_keyword_limits(v_owner);
  end loop;
end;
$$;
