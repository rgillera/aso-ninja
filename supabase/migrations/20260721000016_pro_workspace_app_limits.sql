-- Pro: workspace limit rises to 4 (was 2), app limit rises to 20 (was 10);
-- competitor limit stays at 5 per app.
update plans set workspace_limit = 4, app_limit = 20, updated_at = now()
where slug = 'pro';
