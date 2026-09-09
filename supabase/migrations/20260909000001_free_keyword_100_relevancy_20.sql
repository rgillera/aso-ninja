-- Free keyword tracking is near-zero marginal cost (unofficial iTunes/Play
-- search, same pipeline every plan shares) and 20 was too low for anyone to
-- run a real single-app keyword set before hitting the wall -- raise it to
-- 100, still well short of Basic's unlimited so multi-app/portfolio users
-- still have a reason to upgrade (keyword_limit is per-workspace, not
-- per-app -- see app/api/keywords/save/route.ts).
--
-- Relevancy/opportunity scoring is NOT the same cost shape -- every
-- uncached keyword scored calls Gemini (embeddings + LLM scoring, see
-- libs/keyword-relevancy.ts), so it stays capped well under the new
-- keyword_limit rather than following it up. 20 keeps free users seeing
-- real scores on a meaningful slice of their tracked set while leaving
-- Basic's 100 a clear, felt step up.
update plans set keyword_limit = 100, updated_at = now() where slug = 'free';
update plans set relevancy_limit = 20, updated_at = now() where slug = 'free';
