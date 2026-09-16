-- Give 'pro' a 7-day free trial (once per customer, enforced via
-- subscriptions.has_used_trial — see 20260714000006_trial_once_per_customer.sql).
update plans set trial_period_days = 7, updated_at = now() where slug = 'pro';
