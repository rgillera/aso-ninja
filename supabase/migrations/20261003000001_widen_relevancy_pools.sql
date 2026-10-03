-- Widen the relevancy/opportunity pools: Free 20 -> 40, Pro 700 -> 1000,
-- Pro+ 4000 -> 5000. Free's onboarding wizard can spend up to 12 of the pool
-- (MAX_SUGGESTIONS in features/onboarding/OnboardingWizard.tsx), which left a
-- 20 pool with ~8 scores for the real Keywords Research page -- not enough to
-- score one app's metadata set. 40 leaves ~28. Purely a data change --
-- enforce_relevancy_limit() and get_workspace_usage() read
-- plans.relevancy_limit dynamically, and raising a limit never freezes rows
-- in reconcile_plan_limits. Basic (retired, 100) and Enterprise (null) are
-- untouched.
update plans set relevancy_limit = 40,   updated_at = now() where slug = 'free';
update plans set relevancy_limit = 1000, updated_at = now() where slug = 'pro';
update plans set relevancy_limit = 5000, updated_at = now() where slug = 'pro_plus';
