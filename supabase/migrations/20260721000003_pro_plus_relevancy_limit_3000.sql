-- Pro+ also gets a relevancy/opportunity pool rather than being fully
-- unlimited -- 3,000 keywords, matching its existing (now-removed) keyword
-- cap. Enterprise remains the only fully unlimited tier.
update plans set relevancy_limit = 3000, updated_at = now() where slug = 'pro_plus';
