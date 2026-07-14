-- Pricing restructure: the old 'pro' plan becomes 'basic' (same price/limits,
-- new name), and a new 'pro' tier is inserted between it and 'pro_plus'.
-- 'pro_plus' and 'enterprise' are unchanged.

alter table plans
  add column trial_period_days integer;

update plans
set slug = 'basic', name = 'Basic', updated_at = now()
where slug = 'pro';

update plans
set sort_order = 3, updated_at = now()
where slug = 'pro_plus';

update plans
set sort_order = 4, updated_at = now()
where slug = 'enterprise';

insert into plans (
  slug, name, price_monthly_cents, price_yearly_cents,
  keyword_limit, workspace_limit, member_limit, app_limit, competitor_limit,
  stripe_price_id, stripe_price_id_yearly, trial_period_days, sort_order
) values (
  'pro', 'Pro', 8939, 89390,
  700, 1, 0, 10, 5,
  'price_1Tq5iUDSqc9sbFVhjTYEm7uc', 'price_1Tq5iTDSqc9sbFVhnbVDyU5A', 7, 2
);
