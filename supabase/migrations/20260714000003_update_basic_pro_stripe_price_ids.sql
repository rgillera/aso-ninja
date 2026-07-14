-- Refresh Stripe price IDs for 'basic' and 'pro' with newly created prices.

update plans set
  stripe_price_id = 'price_1Tt1TjDSqc9sbFVhXvezhO05',
  stripe_price_id_yearly = 'price_1Tt1TjDSqc9sbFVhA7RBbYY8',
  updated_at = now()
where slug = 'basic';

update plans set
  stripe_price_id = 'price_1Tt1TcDSqc9sbFVhCk26SAfe',
  stripe_price_id_yearly = 'price_1Tt1TcDSqc9sbFVhyP5MqTA4',
  updated_at = now()
where slug = 'pro';
