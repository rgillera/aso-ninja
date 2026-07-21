-- Managed ASO reprices to $1,497/mo effective ($17,964/yr) yearly-billed;
-- monthly-billed derives from that using the same "yearly = monthly x 10"
-- (2 months free) ratio every other plan uses, i.e. $1,796.40/mo.
-- stripe_price_id/_yearly intentionally left untouched -- see
-- 20260721000012_sync_stripe_prices.sql: production still runs on the
-- unmigrated DB, so its live Stripe prices shouldn't be archived again until
-- a DB migration push is actually planned alongside it.
update plans set price_monthly_cents = 179640, price_yearly_cents = 1796400, updated_at = now()
where slug = 'enterprise';
