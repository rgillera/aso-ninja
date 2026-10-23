-- Headline numbers for the admin Engagement page: estimated MRR, paying
-- users and trials.
--
-- subscriptions doesn't record the billing interval, so MRR is estimated at
-- list price: yearly plans at price_yearly_cents / 12 when the user's latest
-- checkout_completed event says yearly, monthly price otherwise. Discounts
-- and promo codes aren't reflected; Stripe stays the source of truth.
-- Only Stripe-billed rows count, so comped plans don't inflate it.
create or replace function public.admin_revenue_summary(p_exclude_emails text[] default '{}')
returns table (mrr_cents bigint, paying integer, trialing integer)
language sql stable security definer
set search_path = ''
as $$
  with billing as (
    select distinct on (user_id) user_id, props ->> 'billing' as billing
      from public.user_events
     where name = 'checkout_completed'
     order by user_id, created_at desc
  ),
  subs as (
    select s.status,
           case
             when b.billing = 'yearly' and p.price_yearly_cents is not null then p.price_yearly_cents / 12.0
             else coalesce(p.price_monthly_cents, 0)
           end as monthly_cents
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id and p.slug <> 'free'
      join auth.users u on u.id = s.user_id
      left join billing b on b.user_id = s.user_id
     where s.status in ('active', 'trialing')
       and s.stripe_subscription_id is not null
       and coalesce(lower(u.email), '') <> all (p_exclude_emails)
  )
  select coalesce(round(sum(monthly_cents) filter (where status = 'active')), 0)::bigint,
         (count(*) filter (where status = 'active'))::int,
         (count(*) filter (where status = 'trialing'))::int
    from subs;
$$;

revoke execute on function public.admin_revenue_summary(text[]) from public, anon, authenticated;
grant execute on function public.admin_revenue_summary(text[]) to service_role;
