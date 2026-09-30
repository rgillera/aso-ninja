-- Reprices Pro to $39/mo ($348/yr) and Pro+ to $99/mo ($948/yr), matching
-- features/subscription/plans.ts. Yearly prices are picked so the per-month
-- yearly figure is round ($29 / $79).
--
-- Stripe prices are immutable, so this points both tiers at NEW live-mode
-- price IDs. Like 20260721000019_wire_pro_and_pro_plus_stripe_ids.sql, they
-- belong to the live Stripe account and are taken on trust from whoever
-- created them, not verified against the Stripe API.
--
-- Existing subscribers stay on their old Stripe price until moved in Stripe.
-- The webhook only overwrites plan_id when the price ID matches a plan, so an
-- unmatched old price leaves their plan as-is rather than dropping them.

update plans set
  price_monthly_cents    = 3900,
  price_yearly_cents     = 34800,
  stripe_price_id        = 'price_1ULQgBDSqc9sbFVhev1Rbk5T',
  stripe_price_id_yearly = 'price_1ULQh6DSqc9sbFVhSdbb6zcu',
  updated_at             = now()
where slug = 'pro';

update plans set
  price_monthly_cents    = 9900,
  price_yearly_cents     = 94800,
  stripe_price_id        = 'price_1ULQiqDSqc9sbFVh2cJebsVl',
  stripe_price_id_yearly = 'price_1ULQjQDSqc9sbFVhbICvF9eM',
  updated_at             = now()
where slug = 'pro_plus';
