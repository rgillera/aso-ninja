-- Reprices Pro to $39/mo ($384/yr, i.e. $32/mo billed yearly, 2 months free) for NEW
-- subscribers, matching features/subscription/plans.ts.
--
-- Stripe prices are immutable, so this points Pro at NEW live-mode price IDs.
-- Like 20261003000002_reprice_pro_29.sql, they belong to the live Stripe
-- account and are taken on trust from whoever created them.
--
-- Existing $29/mo ($288/yr) subscribers are grandfathered: they stay on their
-- old Stripe price, and the webhook only overwrites plan_id when the price ID
-- matches a plan, so their plan stays Pro.
--
-- The monthly price is the $39 one first used by 20260930000001_reprice_pro_and_pro_plus.sql, reused.

update plans set
  price_monthly_cents    = 3900,
  price_yearly_cents     = 38400,
  stripe_price_id        = 'price_1ULQgBDSqc9sbFVhev1Rbk5T',
  stripe_price_id_yearly = 'price_1UcA4UDSqc9sbFVhQvJ2Bab0',
  updated_at             = now()
where slug = 'pro';
