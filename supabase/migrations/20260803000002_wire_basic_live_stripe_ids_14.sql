-- Points Basic at the live Stripe Price objects backing its new $16.80/mo /
-- $168/yr pricing (20260803000001_basic_price_increase_14.sql left
-- stripe_price_id/stripe_price_id_yearly on the old amounts since Stripe
-- Prices are immutable). Same caveat as
-- 20260721000015_wire_production_stripe_ids.sql: these belong to a Stripe
-- account/mode this session's STRIPE_SECRET_KEY (the "AppASO sandbox" test
-- key) cannot see or verify, so they're taken on trust from whoever created
-- them, not confirmed against the Stripe API. stripe_product_id is
-- untouched -- these are new Prices under the existing Basic product, not a
-- new product.
update plans set
  stripe_price_id        = 'price_1U0HiEDSqc9sbFVhw7nVk7d3',
  stripe_price_id_yearly = 'price_1U0HjMDSqc9sbFVh1ynpO4Q0',
  updated_at              = now()
where slug = 'basic';
