-- Basic now includes relevancy/opportunity scoring (gated in app code by plan
-- slug, not a DB column), traded off against a lower keyword limit.
update plans set keyword_limit = 100, updated_at = now() where slug = 'basic';
