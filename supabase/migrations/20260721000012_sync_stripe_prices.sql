-- Wires up real Stripe Price objects matching the pricing this session
-- landed on (Basic $8.40/$84, Pro $176.40/$1,764, Managed ASO $1,736.40/
-- $17,364) -- the DB and marketing copy have been ahead of Stripe since
-- 20260721000004 first changed a price without creating a matching Stripe
-- object. The old prices are archived (not deleted -- Stripe Prices can't
-- be deleted) rather than reused, since Stripe Prices are immutable.
--
-- Also backfills stripe_product_id, which was never populated, and (for
-- Pro) points at the Stripe product still named/tagged from the pro_plus
-- merge -- renamed to "Pro" and reactivated directly in Stripe, alongside
-- renaming Enterprise's product to "Managed ASO".

update plans set
  stripe_product_id      = 'prod_Up1F2r0mULAx6a',
  stripe_price_id        = 'price_1TvZR7DERPnt0s7ZewbQgVe9',
  stripe_price_id_yearly = 'price_1TvZR8DERPnt0s7ZaHRYGJo1',
  updated_at              = now()
where slug = 'basic';

update plans set
  stripe_product_id      = 'prod_Up1HPihy6FbEkf',
  stripe_price_id        = 'price_1TvZR8DERPnt0s7ZsyUzWtrD',
  stripe_price_id_yearly = 'price_1TvZR9DERPnt0s7ZGmo9onHm',
  updated_at              = now()
where slug = 'pro';

update plans set
  stripe_product_id      = 'prod_Up1JbuuHuc6zrG',
  stripe_price_id        = 'price_1TvZR9DERPnt0s7ZP0tW2aCH',
  stripe_price_id_yearly = 'price_1TvZRADERPnt0s7ZAWBRWs1Q',
  updated_at              = now()
where slug = 'enterprise';
