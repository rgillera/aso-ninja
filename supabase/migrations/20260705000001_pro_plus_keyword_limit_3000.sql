-- Raise the Pro+ plan's keyword limit from 2,500 to 3,000.
update plans set keyword_limit = 3000, updated_at = now() where slug = 'pro_plus';
