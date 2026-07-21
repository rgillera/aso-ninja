-- Basic yearly price drops to $84/yr (was $149.88/yr) as part of the pricing
-- restructure. stripe_price_id_yearly is intentionally left untouched --
-- Stripe Prices are immutable, so actually charging this new amount at
-- checkout requires creating a new Stripe Price object and pointing this
-- column at it separately before this can go live.
update plans set price_yearly_cents = 8400, updated_at = now() where slug = 'basic';
