-- Pro reprices to $197/mo effective ($2,364/yr) yearly-billed; monthly-billed
-- derives from that using the same "yearly = monthly x 10" (2 months free)
-- ratio every other plan uses, i.e. $236.40/mo. stripe_price_id/_yearly are
-- intentionally left untouched this round -- see the incident notes around
-- 20260721000012_sync_stripe_prices.sql: production is still running on the
-- unmigrated DB, and its live Stripe prices should not be archived again
-- until a DB migration push is actually planned alongside it.
update plans set price_monthly_cents = 23640, price_yearly_cents = 236400, updated_at = now()
where slug = 'pro';
