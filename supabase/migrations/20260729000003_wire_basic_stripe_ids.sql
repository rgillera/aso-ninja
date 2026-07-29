-- Points Basic at the live Stripe Price objects backing its new $14.40/mo /
-- $144/yr pricing (20260729000002_basic_yearly_price_and_relevancy.sql
-- left stripe_price_id/stripe_price_id_yearly on the old amounts since
-- Stripe Prices are immutable). Same caveat as
-- 20260721000015_wire_production_stripe_ids.sql: these belong to a Stripe
-- account/mode this session's STRIPE_SECRET_KEY (the "AppASO sandbox" test
-- key) cannot see or verify, so they're taken on trust from whoever created
-- them, not confirmed against the Stripe API. stripe_product_id is
-- untouched -- these are new Prices under the existing Basic product, not a
-- new product.
update plans set
  stripe_price_id        = 'price_1TyLvCDSqc9sbFVhO9PUBIRy',
  stripe_price_id_yearly = 'price_1TyLtjDSqc9sbFVhBjVlKvih',
  updated_at              = now()
where slug = 'basic';
