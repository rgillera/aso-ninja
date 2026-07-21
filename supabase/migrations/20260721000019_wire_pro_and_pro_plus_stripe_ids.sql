-- Points the split Pro and Pro+ tiers at their live production Stripe
-- product/price IDs. Same caveat as 20260721000015_wire_production_stripe_ids.sql:
-- these belong to a Stripe account/mode this session's STRIPE_SECRET_KEY (the
-- "AppASO sandbox" test key) cannot see or verify, so they're taken on trust
-- from whoever created them, not confirmed against the Stripe API.
update plans set
  stripe_product_id      = 'prod_Up1HPihy6FbEkf',
  stripe_price_id        = 'price_1Tq5iaDSqc9sbFVh1671P1vg',
  stripe_price_id_yearly = 'price_1TvfYCDSqc9sbFVhogk2lNQk',
  updated_at              = now()
where slug = 'pro_plus';

update plans set
  stripe_product_id      = 'prod_UvQ0U3bJMrGlrd',
  stripe_price_id        = 'price_1TvZAfDSqc9sbFVhHdKLGsGl',
  stripe_price_id_yearly = 'price_1TvfqmDSqc9sbFVhokPqRaMo',
  updated_at              = now()
where slug = 'pro';
