-- Basic monthly price rises to $16.80/mo (was $14.40/mo) and yearly rises to
-- $168/yr -- $14/mo billed yearly (was $144/yr -- $12/mo). $16.80 x 10 keeps
-- the same "2 months free" ratio every other plan's monthly/yearly pair
-- already uses (see priceYearlyCents' comment in
-- features/subscription/plans.ts).
--
-- stripe_price_id / stripe_price_id_yearly are intentionally left untouched
-- -- Stripe Prices are immutable, so actually charging either new amount at
-- checkout requires creating new Stripe Price objects and pointing these
-- columns at them separately before this can go live.
update plans set price_monthly_cents = 1680, price_yearly_cents = 16800, updated_at = now()
where slug = 'basic';
