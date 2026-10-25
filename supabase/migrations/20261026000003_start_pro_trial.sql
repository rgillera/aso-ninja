-- Opt-in Pro trial for users who never had the signup one: Free users from
-- before 20261025000001, and paid users who cancelled. Same 7 days, same
-- pro_trial_ends_at, so get_effective_plan, the sidebar countdown and
-- /api/cron/pro-trial all pick it up unchanged. Still one per email,
-- through pro_trial_claims (20261026000002).
--
-- A cancelled paid user's row keeps its old plan_id with status 'canceled',
-- which get_effective_plan reads as Free without looking at the trial. Their
-- row is turned back into a plain Free row first (stripe_customer_id kept,
-- so a later checkout reuses the customer). Churn history lives in
-- cancellation_feedback, not here.

-- The user's subscription if they can start a trial: no paid plan running,
-- never had a trial, email not claimed. null otherwise.
create or replace function pro_trial_eligible_subscription(p_user_id uuid)
returns public.subscriptions
language sql
stable
security definer set search_path = ''
as $$
  select s.*
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  join auth.users u on u.id = s.user_id
  where s.user_id = p_user_id
    and s.pro_trial_ends_at is null
    and (pl.slug = 'free' or s.status not in ('active', 'trialing', 'past_due'))
    and u.email is not null
    and not exists (
      select 1 from public.pro_trial_claims c
      where c.email = public.normalize_trial_email(u.email)
    );
$$;

create or replace function can_start_pro_trial()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select (public.pro_trial_eligible_subscription(auth.uid())).user_id is not null;
$$;

-- Starts the trial and returns its end, or null if the user can't have one.
create or replace function start_pro_trial()
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  v_sub   public.subscriptions;
  v_email text;
  v_end   timestamptz;
begin
  v_sub := public.pro_trial_eligible_subscription(auth.uid());
  if v_sub.user_id is null then
    return null;
  end if;

  select public.normalize_trial_email(u.email) into v_email
  from auth.users u
  where u.id = v_sub.user_id;

  -- Claimed first, so two clicks racing can't both get a trial.
  insert into public.pro_trial_claims (email) values (v_email)
  on conflict (email) do nothing;
  if not found then
    return null;
  end if;

  v_end := now() + interval '7 days';

  update public.subscriptions s
  set plan_id = (select pl.id from public.plans pl where pl.slug = 'free'),
      status = 'active',
      stripe_subscription_id = null,
      cancel_at_period_end = false,
      current_period_end = null,
      pro_trial_ends_at = v_end,
      pro_trial_reminder_sent_at = null,
      pro_trial_last_day_sent_at = null,
      pro_trial_reconciled_at = null,
      updated_at = now()
  where s.user_id = v_sub.user_id;

  -- Unfreezes whatever Free's limits had paused, now that Pro's apply.
  perform public.reconcile_plan_limits(v_sub.user_id);

  return v_end;
end;
$$;

revoke execute on function pro_trial_eligible_subscription(uuid) from public, anon, authenticated;
revoke execute on function can_start_pro_trial() from public, anon;
revoke execute on function start_pro_trial() from public, anon;
grant execute on function can_start_pro_trial() to authenticated;
grant execute on function start_pro_trial() to authenticated;
