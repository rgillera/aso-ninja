-- Drops the free trial from every plan. With Pro at $39/mo the Free plan is
-- the way to try the product, and trials were mostly costing scoring spend on
-- users who cancelled. Checkout only adds a trial when trial_period_days is
-- set, so this alone turns it off; subscriptions already trialing are
-- untouched in Stripe and convert or end as before.
update plans set trial_period_days = null, updated_at = now()
where trial_period_days is not null;
