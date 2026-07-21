-- Monthly-billing prices now derive from the yearly price using the "2
-- months free" relationship the site already advertises on the billing
-- toggle (monthly = yearly / 10), instead of being set independently. Free
-- is unaffected (already 0).
update plans set price_monthly_cents = round(price_yearly_cents / 10.0), updated_at = now()
where slug in ('basic', 'pro', 'enterprise');
