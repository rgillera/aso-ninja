-- Give 'basic' the same 7-day free trial as 'pro', and remove the trial from 'pro_plus'.
update plans
set trial_period_days = 7, updated_at = now()
where slug = 'basic';

update plans
set trial_period_days = null, updated_at = now()
where slug = 'pro_plus';
