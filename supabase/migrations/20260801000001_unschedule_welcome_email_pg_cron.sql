-- Vercel is now on a paid plan, which lifts the once-daily cron limit that
-- forced the welcome-email poller onto pg_cron (see
-- 20260720000002_schedule_welcome_email_cron.sql). It's now scheduled
-- natively in vercel.json at the same */5 * * * * cadence, so drop the
-- pg_cron job to avoid sending duplicate emails.

select cron.unschedule('send-welcome-emails');
