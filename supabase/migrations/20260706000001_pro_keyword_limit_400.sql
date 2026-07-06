-- Lower the Pro plan's keyword limit from 500 to 400.
update plans set keyword_limit = 400, updated_at = now() where slug = 'pro';
