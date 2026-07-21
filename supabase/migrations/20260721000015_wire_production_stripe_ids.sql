-- Points Pro and Basic at the Stripe product/price IDs actually backing
-- production checkout. These belong to a Stripe account/mode this session's
-- STRIPE_SECRET_KEY (the "AppASO sandbox" test key) cannot see or verify --
-- "No such price" when queried directly -- so they're taken on trust from
-- whoever created them, not confirmed against the Stripe API.
update plans set
  stripe_product_id      = 'prod_UvQ0U3bJMrGlrd',
  stripe_price_id        = 'price_1TvZAfDSqc9sbFVhHdKLGsGl',
  stripe_price_id_yearly = 'price_1TvZAfDSqc9sbFVhpki9XYFH',
  updated_at              = now()
where slug = 'pro';

update plans set
  stripe_product_id      = 'prod_UvQ01n6MlpCU5u',
  stripe_price_id        = 'price_1TvZAmDSqc9sbFVhKtIHD3Sc',
  stripe_price_id_yearly = 'price_1TvZAmDSqc9sbFVhcoXVD5fc',
  updated_at              = now()
where slug = 'basic';
