-- Narrow Pro's relevancy/opportunity pool from 1,000 to 500 keywords. Widens
-- the gap to Pro+'s 3,000 (3x -> 6x) so the upgrade reads as a bigger step
-- up. No existing Pro subscribers yet, so no in-flight usage to reconcile.
update plans set relevancy_limit = 500, updated_at = now() where slug = 'pro';
