-- Extend the 7-day free trial (already on 'pro') to 'pro_plus' as well.
update plans
set trial_period_days = 7, updated_at = now()
where slug = 'pro_plus';
