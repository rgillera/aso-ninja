-- Competitor limits go up to 5 per app on Pro (was 3) and 8 on Pro+ (was 5),
-- matching the 5-8 search competitors the Competitor Gap tab and the
-- "Competitor & keyword gap research" playbook lesson recommend.
update plans set competitor_limit = 5, updated_at = now() where slug = 'pro';
update plans set competitor_limit = 8, updated_at = now() where slug = 'pro_plus';

-- Competitors frozen under the old, lower limits only get reconciled on the
-- next subscription/competitor change, so unfreeze them now (oldest first, up
-- to the new limit — same rule reconcile_competitor_limits always applies).
select public.reconcile_competitor_limits(app_id)
from (select distinct app_id from app_competitors where status = 'frozen') frozen;
