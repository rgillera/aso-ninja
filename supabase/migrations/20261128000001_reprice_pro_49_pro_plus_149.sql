-- Reprices Pro to $49/mo ($490/yr) and Pro+ to $149/mo ($1,490/yr), yearly
-- being exactly 2 months free, for NEW subscribers,
-- matching features/subscription/plans.ts.
--
-- Stripe prices are immutable, so this points both tiers at NEW live-mode
-- price IDs. Like 20261116000001_reprice_pro_39.sql, they belong to the live
-- Stripe account and are taken on trust from whoever created them.
--
-- Existing subscribers are grandfathered: they stay on their old Stripe price,
-- and the webhook only overwrites plan_id when the price ID matches a plan, so
-- their plan stays Pro / Pro+ at the price they signed up at.

update plans set
  price_monthly_cents    = 4900,
  price_yearly_cents     = 49000,
  stripe_price_id        = 'price_1UgSAuDSqc9sbFVhitEIDDig',
  stripe_price_id_yearly = 'price_1UgSBjDSqc9sbFVhx5VboYdX',
  updated_at             = now()
where slug = 'pro';

update plans set
  price_monthly_cents    = 14900,
  price_yearly_cents     = 149000,
  stripe_price_id        = 'price_1UgSCPDSqc9sbFVhdqPcJbd5',
  stripe_price_id_yearly = 'price_1UgSCoDSqc9sbFVhwn5YV0G2',
  updated_at             = now()
where slug = 'pro_plus';
