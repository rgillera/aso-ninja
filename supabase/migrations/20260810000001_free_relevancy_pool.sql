-- Free gets a taste of relevancy & opportunity scoring: a small lifetime
-- pool of 10 keywords, using the exact same mechanism Basic/Pro/Pro+ already
-- use (relevancy_limit + relevancy_scored_count from get_workspace_usage()).
-- Free previously had no access at all -- the app-layer gate moves from "an
-- explicit basic-and-up tier check" to "every plan has some pool" in the
-- same change (see app/api/keywords/metrics/route.ts,
-- features/aso/keywords/research/index.tsx,
-- features/aso/keywords/research/KeywordTable.tsx). Enterprise stays the
-- only fully unlimited tier (relevancy_limit = null, untouched).
update plans set relevancy_limit = 10, updated_at = now() where slug = 'free';
