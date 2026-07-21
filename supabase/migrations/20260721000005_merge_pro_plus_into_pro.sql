-- Retire the Pro+ tier: Pro absorbs its higher limits, its stripe price IDs
-- (already minted at exactly this new price -- $149/mo, $1,490/yr -- so no
-- new Stripe objects are needed), and unlimited relevancy/opportunity
-- scoring (relevancy_limit = null). Pro keeps its own trial_period_days
-- rather than adopting Pro+'s (Pro+ had none).
update plans p
set
  price_monthly_cents    = pp.price_monthly_cents,
  price_yearly_cents     = pp.price_yearly_cents,
  workspace_limit        = pp.workspace_limit,
  member_limit           = pp.member_limit,
  app_limit              = pp.app_limit,
  competitor_limit       = pp.competitor_limit,
  relevancy_limit        = null,
  stripe_price_id        = pp.stripe_price_id,
  stripe_price_id_yearly = pp.stripe_price_id_yearly,
  updated_at             = now()
from (select * from plans where slug = 'pro_plus') pp
where p.slug = 'pro';

-- Move any existing Pro+ subscribers onto the now-equivalent Pro plan before
-- the row disappears -- subscriptions.plan_id's FK would otherwise block the delete.
update subscriptions
set plan_id = (select id from plans where slug = 'pro'), updated_at = now()
where plan_id = (select id from plans where slug = 'pro_plus');

delete from plans where slug = 'pro_plus';

update plans set sort_order = 3, updated_at = now() where slug = 'enterprise';
