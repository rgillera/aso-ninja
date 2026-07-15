-- Raise the Pro plan's keyword limit from 700 to 1000.
update plans set keyword_limit = 1000, updated_at = now() where slug = 'pro';
