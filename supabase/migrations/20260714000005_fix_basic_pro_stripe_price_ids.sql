-- The price IDs set in 20260714000003 don't exist in Stripe (confirmed via
-- API — likely copied from the wrong mode/account). Replaced with the real
-- price IDs found by listing prices under each plan's actual Product:
--   Basic Plan (prod_Up1F2r0mULAx6a) — these are the same IDs 'basic' had
--   originally, before 20260714000003 overwrote them incorrectly.
--   Pro Plan (prod_UsmlflbP3A5cTX) — newly found; matches the $89.39/mo,
--   $893.88/yr pricing already shown on the site.

update plans set
  stripe_price_id = 'price_1TpNCrDERPnt0s7ZaKhh9LY3',
  stripe_price_id_yearly = 'price_1TpNQbDERPnt0s7Z7kpGUIry',
  price_yearly_cents = 14988,
  updated_at = now()
where slug = 'basic';

update plans set
  stripe_price_id = 'price_1Tt1CqDERPnt0s7ZpJJU5wMI',
  stripe_price_id_yearly = 'price_1Tt1CGDERPnt0s7Zt49K7PYN',
  price_yearly_cents = 89388,
  updated_at = now()
where slug = 'pro';
