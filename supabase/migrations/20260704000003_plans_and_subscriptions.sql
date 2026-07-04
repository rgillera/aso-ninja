-- Subscription plans — editable directly in this table, no redeploy needed to change limits.
-- null on a *_limit column means unlimited.

create table plans (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  price_monthly_cents  integer not null default 0,
  keyword_limit        integer,  -- pooled across every workspace the subscriber owns
  workspace_limit      integer,  -- max workspaces a user may own
  member_limit         integer,  -- max non-owner members per workspace
  app_limit            integer,  -- max apps per workspace
  competitor_limit     integer,  -- max competitor apps tracked per app
  stripe_product_id    text,
  stripe_price_id      text,
  is_active            boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

insert into plans (slug, name, price_monthly_cents, keyword_limit, workspace_limit, member_limit, app_limit, competitor_limit, sort_order) values
  ('free',       'Free Plan',  0,      20,   1,    0,    1,    1,    0),
  ('pro',        'Pro Plan',   1499,   500,  1,    0,    5,    5,    1),
  ('pro_plus',   'Pro+ Plan',  14900,  2500, 2,    5,    20,   15,   2),
  ('enterprise', 'Enterprise', 149900, null, null, null, null, null, 3);

alter table plans enable row level security;

create policy "anyone can view active plans"
  on plans for select
  using (is_active);

-- Subscriptions — one row per user, tracks which plan they're subscribed to

create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  plan_id                uuid not null references plans(id),
  status                 subscription_status not null default 'active',
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index on subscriptions (user_id);

alter table subscriptions enable row level security;

create policy "users can view their own subscription"
  on subscriptions for select
  using (user_id = auth.uid());

-- Every new user starts on the free plan
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan_id)
  select new.id, id from public.plans where slug = 'free'
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill users who signed up before this migration existed
insert into subscriptions (user_id, plan_id)
select u.id, p.id
from auth.users u
cross join (select id from plans where slug = 'free') p
on conflict (user_id) do nothing;

-- Helper functions shared by enforcement triggers and usage read-outs

create or replace function get_effective_plan(p_user_id uuid)
returns public.plans
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  result public.plans;
begin
  select pl.* into result
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing');

  if not found then
    select pl.* into result from public.plans pl where pl.slug = 'free';
  end if;

  return result;
end;
$$;

create or replace function get_workspace_owner(p_workspace_id uuid)
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select user_id from public.workspace_members
  where workspace_id = p_workspace_id and role = 'owner'
  limit 1;
$$;

create or replace function get_workspace_plan(p_workspace_id uuid)
returns public.plans
language sql
stable
security definer set search_path = ''
as $$
  select public.get_effective_plan(public.get_workspace_owner(p_workspace_id));
$$;
