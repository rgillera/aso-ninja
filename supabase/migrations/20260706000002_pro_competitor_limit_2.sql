-- Lower the Pro plan's competitor limit from 5 to 2 per app.
update plans set competitor_limit = 2, updated_at = now() where slug = 'pro';
