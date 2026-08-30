-- Local-dev-only overrides, applied after migrations on every `supabase db reset`.
--
-- Several `wire_*_stripe_ids` migrations point `plans.stripe_price_id(_yearly)` at
-- LIVE-mode Stripe price IDs (see 20260721000019_wire_pro_and_pro_plus_stripe_ids.sql).
-- The local STRIPE_SECRET_KEY is a test-mode "AppASO sandbox" key that can't see
-- those, so checkout fails with "No such price" for basic/pro/pro_plus unless we
-- repoint them here at sandbox test-mode equivalents that mirror the same amounts
-- (see plans.price_monthly_cents / price_yearly_cents for the amounts they must match).
--
-- This file is local-seed-only — it is never applied by `supabase db push`, so it
-- has no effect on staging/production data.

update plans set
  stripe_product_id      = 'prod_UvXQt0aedbYaUL',
  stripe_price_id        = 'price_1UA8zmDERPnt0s7Z9OjlxVIl',       -- $16.80/mo
  stripe_price_id_yearly = 'price_1UA8zmDERPnt0s7Zocz76QpL',       -- $168.00/yr
  updated_at              = now()
where slug = 'basic';

update plans set
  stripe_product_id      = 'prod_UvXRUaksMxM7NS',
  stripe_price_id        = 'price_1TvgM9DERPnt0s7ZqGeZTqR2',       -- $80.40/mo
  stripe_price_id_yearly = 'price_1TvgMADERPnt0s7ZBYQtxyEX',       -- $804.00/yr
  updated_at              = now()
where slug = 'pro';

update plans set
  stripe_product_id      = 'prod_Up1HPihy6FbEkf',
  stripe_price_id        = 'price_1TvagHDERPnt0s7ZTgKODsTn',       -- $236.40/mo
  stripe_price_id_yearly = 'price_1TvagNDERPnt0s7Z4Gw0yzLx',       -- $2,364.00/yr
  updated_at              = now()
where slug = 'pro_plus';

-- 'enterprise' already resolves correctly against the sandbox key as wired by
-- migrations — no override needed.
