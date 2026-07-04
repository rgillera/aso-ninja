-- Competitor apps tracked against a primary app.
--
-- Previously this only lived in localStorage (features/aso/keywords/*/index.tsx,
-- `competitors-${appId}`), which means there was nothing server-side to
-- enforce a plan limit against — a browser can always write more to
-- localStorage. This table is the persisted, enforceable version.

create table app_competitors (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references apps(id) on delete cascade,
  store_id    text not null,
  name        text not null,
  icon_url    text,
  developer   text,
  created_at  timestamptz not null default now(),
  unique (app_id, store_id)
);

create index on app_competitors (app_id);

alter table app_competitors enable row level security;

create policy "workspace members can read competitors"
  on app_competitors for select
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace admins and owners can manage competitors"
  on app_competitors for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  ));

-- Per-app competitor limit. Plain single-row inserts (no upsert pattern
-- here), so a row-level BEFORE INSERT trigger is sufficient.
create or replace function enforce_competitor_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_plan         public.plans;
  v_count        integer;
begin
  select workspace_id into v_workspace_id from public.apps where id = new.app_id;

  v_plan := public.get_workspace_plan(v_workspace_id);

  if v_plan.competitor_limit is not null then
    select count(*) into v_count
    from public.app_competitors
    where app_id = new.app_id;

    if v_count >= v_plan.competitor_limit then
      raise exception 'Competitor limit reached for your plan (% competitors per app). Upgrade to track more.', v_plan.competitor_limit;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_competitor_limit
  before insert on app_competitors
  for each row
  execute function enforce_competitor_limit();
