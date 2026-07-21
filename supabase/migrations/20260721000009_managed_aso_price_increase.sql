-- Managed ASO's yearly price rises to reflect the added growth-manager
-- seat: now shows as $1,447/mo billed yearly ($17,364/yr), up from $1,247/mo.
-- Monthly-billing price is unchanged. stripe_price_id_yearly is intentionally
-- left untouched -- see 20260721000007_pro_enterprise_yearly_price.sql for why.
update plans set price_yearly_cents = 1736400, updated_at = now() where slug = 'enterprise';
