-- No plan offers a free trial anymore -- Basic and Pro both had 7 days.
update plans set trial_period_days = null, updated_at = now() where slug in ('basic', 'pro');
