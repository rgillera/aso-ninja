-- Reverse trial: every new signup gets Pro for 7 days with no card, then
-- falls back to Free on its own. Nothing goes through Stripe: the
-- subscriptions row stays on the free plan and get_effective_plan answers
-- 'pro' while pro_trial_ends_at is in the future, so every existing plan
-- gate (DB triggers, API routes, isPlanAtLeast in the UI) unlocks with no
-- per-feature changes.
--
-- Lives on subscriptions for the same reason has_used_trial does
-- (20260714000006): no user-writable RLS policy, so nobody can push their
-- own end date out. The default only fires on insert, i.e. the
-- handle_new_user trigger, so existing users get no trial (null) and the
-- Stripe webhook's upsert never resets it.
alter table subscriptions
  add column pro_trial_ends_at timestamptz,
  -- Written by /api/cron/pro-trial: the "2 days left" and "last day"
  -- emails, and the reconcile that freezes whatever is over Free's limits
  -- once the trial is over.
  add column pro_trial_reminder_sent_at timestamptz,
  add column pro_trial_last_day_sent_at timestamptz,
  add column pro_trial_reconciled_at timestamptz;

alter table subscriptions
  alter column pro_trial_ends_at set default now() + interval '7 days';

create index on subscriptions (pro_trial_ends_at) where pro_trial_ends_at is not null;

-- A trial is only live while the user is still on the free plan: buying a
-- plan mid-trial means their real plan wins from then on.
create or replace function get_effective_plan(p_user_id uuid)
returns public.plans
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  result     public.plans;
  v_trial_end timestamptz;
  v_free_relevancy integer;
begin
  select pl.* into result
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing');

  if not found then
    select pl.* into result from public.plans pl where pl.slug = 'free';
    return result;
  end if;

  select s.pro_trial_ends_at into v_trial_end
  from public.subscriptions s
  where s.user_id = p_user_id;

  if result.slug = 'free' and v_trial_end > now() then
    v_free_relevancy := result.relevancy_limit;
    select pl.* into result from public.plans pl where pl.slug = 'pro';
    -- Scoring is the trial's real cost (the reason card-free trials were
    -- dropped in 20261001000001), so it stays at Free's pool.
    result.relevancy_limit := v_free_relevancy;
  end if;

  return result;
end;
$$;

-- The owner's trial end while it's still running, for the sidebar
-- countdown and the subscription page. null = no live trial.
create or replace function get_workspace_trial_end(p_workspace_id uuid)
returns timestamptz
language sql
stable
security definer set search_path = ''
as $$
  select s.pro_trial_ends_at
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = public.get_workspace_owner(p_workspace_id)
    and pl.slug = 'free'
    and s.pro_trial_ends_at > now();
$$;
