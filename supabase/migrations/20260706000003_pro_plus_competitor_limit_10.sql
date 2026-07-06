-- Lower the Pro+ plan's competitor limit from 15 to 10 per app.
update plans set competitor_limit = 10, updated_at = now() where slug = 'pro_plus';
