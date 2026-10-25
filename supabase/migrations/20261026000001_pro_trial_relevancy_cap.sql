-- The signup Pro trial kept scoring at Free's pool (40), which made the
-- trial feel like Free in the one place Pro is worth paying for. It gets
-- its own pool instead: enough to score a real keyword set, still a
-- fraction of Pro's 1,000. Anything scored past Free's pool is frozen by
-- the /api/cron/pro-trial reconcile once the trial ends, same as before.
create or replace function get_effective_plan(p_user_id uuid)
returns public.plans
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  result     public.plans;
  v_trial_end timestamptz;
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
    select pl.* into result from public.plans pl where pl.slug = 'pro';
    -- Scoring is the trial's real cost (the reason card-free trials were
    -- dropped in 20261001000001), so it gets a trial-sized pool.
    result.relevancy_limit := 200;
  end if;

  return result;
end;
$$;
