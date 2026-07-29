-- Widen the relevancy/opportunity scoring pools across all three tiers that
-- have one: Basic 50 -> 100, Pro 500 -> 700, Pro+ 3,000 -> 4,000. Enterprise
-- stays the only fully unlimited tier (relevancy_limit = null, untouched).
-- Purely a data change -- enforce_relevancy_limit() and get_workspace_usage()
-- already read v_plan.relevancy_limit dynamically, so no function changes
-- are needed for the new caps to take effect.
update plans set relevancy_limit = 100, updated_at = now() where slug = 'basic';
update plans set relevancy_limit = 700, updated_at = now() where slug = 'pro';
update plans set relevancy_limit = 4000, updated_at = now() where slug = 'pro_plus';
