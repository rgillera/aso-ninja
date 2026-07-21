-- Re-split Pro into a mid tier ("pro") and a top tier ("pro_plus"), reversing
-- 20260721000005_merge_pro_plus_into_pro.sql. Unlike the original pro_plus,
-- the new top tier is NOT unlimited on relevancy/opportunity scoring either
-- -- it gets a larger pool (3,000) instead of null. Enterprise remains the
-- only fully unlimited tier.

-- New Pro+ row inherits the current 'pro' row's price, limits, and Stripe
-- price IDs verbatim -- existing Pro subscribers are paying for exactly this
-- feature set today, so nothing about their plan should change except the
-- relevancy pool going from unlimited to 3,000.
insert into plans (
  slug, name, price_monthly_cents, price_yearly_cents,
  keyword_limit, workspace_limit, member_limit, app_limit, competitor_limit,
  relevancy_limit, stripe_product_id, stripe_price_id, stripe_price_id_yearly,
  trial_period_days, sort_order
)
select
  'pro_plus', 'Pro+', price_monthly_cents, price_yearly_cents,
  keyword_limit, workspace_limit, member_limit, app_limit, competitor_limit,
  3000, stripe_product_id, stripe_price_id, stripe_price_id_yearly,
  trial_period_days, 3
from plans where slug = 'pro';

-- Move existing Pro subscribers onto Pro+ before 'pro' is repriced out from
-- under them -- they signed up for the higher limits, not the new mid tier.
update subscriptions
set plan_id = (select id from plans where slug = 'pro_plus'), updated_at = now()
where plan_id = (select id from plans where slug = 'pro');

-- 'pro' becomes the new mid tier, sitting between Basic and Pro+. No Stripe
-- product/price exists for it yet -- checkout for this tier isn't live until
-- those are created and wired in a follow-up migration.
update plans set
  name                    = 'Pro',
  price_monthly_cents     = 8040,
  price_yearly_cents      = 80400,
  keyword_limit           = null,
  workspace_limit         = 1,
  member_limit            = 0,
  app_limit               = 10,
  competitor_limit        = 3,
  relevancy_limit         = 1000,
  stripe_product_id       = null,
  stripe_price_id         = null,
  stripe_price_id_yearly  = null,
  trial_period_days       = null,
  sort_order              = 2,
  updated_at              = now()
where slug = 'pro';

update plans set sort_order = 4, updated_at = now() where slug = 'enterprise';
