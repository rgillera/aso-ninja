-- Basic monthly price rises to $14.40/mo (was $8.40/mo) and yearly rises to
-- $144/yr -- $12/mo billed yearly (was $84/yr -- $7/mo). $14.40 x 10 keeps
-- the same "2 months free" ratio every other plan's monthly/yearly pair
-- already uses (see priceYearlyCents' comment in
-- features/subscription/plans.ts). Basic also gains a lifetime relevancy &
-- opportunity scoring pool (50 keywords) -- previously a Pro-and-up feature
-- entirely. The app-layer gate moves from "pro" to "basic" in the same
-- change (see app/api/keywords/metrics/route.ts,
-- features/aso/keywords/research/index.tsx,
-- features/aso/keywords/research/KeywordTable.tsx) -- Est. downloads per
-- keyword stays a separate Pro-and-up check, no longer aliased to this one.
--
-- stripe_price_id / stripe_price_id_yearly are intentionally left untouched
-- -- Stripe Prices are immutable, so actually charging either new amount at
-- checkout requires creating new Stripe Price objects and pointing these
-- columns at them separately before this can go live.
update plans set price_monthly_cents = 1440, price_yearly_cents = 14400, relevancy_limit = 50, updated_at = now()
where slug = 'basic';
