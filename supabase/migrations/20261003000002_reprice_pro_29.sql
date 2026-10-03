-- Reprices Pro to $29/mo ($288/yr, i.e. $24/mo billed yearly), matching
-- features/subscription/plans.ts. Pro+ stays $99/mo ($948/yr). Pricing grids
-- now default to monthly billing.
--
-- Stripe prices are immutable, so this points Pro at NEW live-mode price IDs.
-- Like 20260930000001_reprice_pro_and_pro_plus.sql, they belong to the live
-- Stripe account and are taken on trust from whoever created them, not
-- verified against the Stripe API.
--
-- Existing subscribers stay on their old Stripe price until moved in Stripe.
-- The webhook only overwrites plan_id when the price ID matches a plan, so an
-- unmatched old price leaves their plan as-is rather than dropping them.

update plans set
  price_monthly_cents    = 2900,
  price_yearly_cents     = 28800,
  stripe_price_id        = 'price_1UMN3tDSqc9sbFVhpRS93ipG',
  stripe_price_id_yearly = 'price_1UMN4aDSqc9sbFVhXdLm4wXb',
  updated_at             = now()
where slug = 'pro';
