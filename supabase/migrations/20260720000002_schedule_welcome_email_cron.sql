-- Vercel's Hobby plan only allows once-daily cron invocations, so the
-- welcome-email poller (needs ~5 min granularity to honor the post-
-- confirmation delay) is scheduled from Postgres via pg_cron instead of
-- vercel.json, calling the route over HTTP via pg_net.
--
-- This migration does NOT set the secrets the job depends on — secrets
-- don't belong in a file committed to git. Run these once per environment
-- (local + production) via the SQL editor after migrating:
--
--   select vault.create_secret('<value of CRON_SECRET>', 'cron_secret');
--   select vault.create_secret('<site URL, e.g. https://www.appaso.io>', 'site_url');
--
-- Locally, host.docker.internal lets the db container reach `next dev`:
--   select vault.create_secret('http://host.docker.internal:3000', 'site_url');
--
-- Until both secrets exist, each run fails harmlessly (net.http_get errors
-- on a null url) — visible in `select * from cron.job_run_details`.

create extension if not exists pg_cron;

select cron.schedule(
  'send-welcome-emails',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'site_url' limit 1)
      || '/api/cron/send-welcome-emails',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    )
  );
  $$
);
