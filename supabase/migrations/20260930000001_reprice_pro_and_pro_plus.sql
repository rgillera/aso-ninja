-- Reprices Pro to $39/mo ($348/yr) and Pro+ to $99/mo ($948/yr), matching
-- features/subscription/plans.ts. Yearly prices are picked so the per-month
-- yearly figure is round ($29 / $79).
--
-- Stripe prices are immutable, so this points both tiers at NEW price IDs.
-- Replace the four REPLACE_ME values below with the live-mode price IDs
-- created in Stripe before pushing; the guard at the bottom aborts the
-- migration if any placeholder is left in.
--
-- Existing subscribers stay on their old Stripe price until moved in Stripe.
-- The webhook only overwrites plan_id when the price ID matches a plan, so an
-- unmatched old price leaves their plan as-is rather than dropping them.

update plans set
  price_monthly_cents    = 3900,
  price_yearly_cents     = 34800,
  stripe_price_id        = 'price_REPLACE_ME_pro_monthly',
  stripe_price_id_yearly = 'price_REPLACE_ME_pro_yearly',
  updated_at             = now()
where slug = 'pro';

update plans set
  price_monthly_cents    = 9900,
  price_yearly_cents     = 94800,
  stripe_price_id        = 'price_REPLACE_ME_pro_plus_monthly',
  stripe_price_id_yearly = 'price_REPLACE_ME_pro_plus_yearly',
  updated_at             = now()
where slug = 'pro_plus';

do $$
begin
  if exists (
    select 1 from plans
    where slug in ('pro', 'pro_plus')
      and (stripe_price_id like '%REPLACE_ME%' or stripe_price_id_yearly like '%REPLACE_ME%')
  ) then
    raise exception 'Fill in the new Stripe price IDs in 20260930000001_reprice_pro_and_pro_plus.sql before pushing';
  end if;
end $$;
