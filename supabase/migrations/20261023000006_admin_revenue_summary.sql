-- Paying users and trials for the admin Engagement page's headline row.
-- MRR itself comes from Stripe (libs/stripe/mrr.ts), since subscriptions
-- doesn't record billing interval or discounts.
-- Only Stripe-billed rows count, so comped plans don't inflate it.
create or replace function public.admin_revenue_summary(p_exclude_emails text[] default '{}')
returns table (paying integer, trialing integer)
language sql stable security definer
set search_path = ''
as $$
  select (count(*) filter (where s.status = 'active'))::int,
         (count(*) filter (where s.status = 'trialing'))::int
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id and p.slug <> 'free'
    join auth.users u on u.id = s.user_id
   where s.status in ('active', 'trialing')
     and s.stripe_subscription_id is not null
     and coalesce(lower(u.email), '') <> all (p_exclude_emails);
$$;

revoke execute on function public.admin_revenue_summary(text[]) from public, anon, authenticated;
grant execute on function public.admin_revenue_summary(text[]) to service_role;
