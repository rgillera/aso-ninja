-- Pro's app/competitor limits (inherited from Pro+ during the tier merge)
-- come back down to 10 apps & 5 competitors per app.
update plans set app_limit = 10, competitor_limit = 5, updated_at = now() where slug = 'pro';
