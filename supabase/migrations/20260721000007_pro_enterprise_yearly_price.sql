-- Pro's yearly price now shows as $147/mo billed yearly ($1,764/yr), and
-- Enterprise as $1,247/mo billed yearly ($14,964/yr). Monthly-billing prices
-- are unchanged. stripe_price_id_yearly is intentionally left untouched --
-- Stripe Prices are immutable, so actually charging these new amounts at
-- checkout requires creating new Stripe Price objects and pointing these
-- columns at them separately before this can go live.
update plans set price_yearly_cents = 176400,  updated_at = now() where slug = 'pro';
update plans set price_yearly_cents = 1496400, updated_at = now() where slug = 'enterprise';
