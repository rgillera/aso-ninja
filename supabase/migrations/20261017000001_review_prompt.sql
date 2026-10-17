-- Trustpilot review prompt (features/review). The dashboard card shows once a
-- user has 10+ tracked keywords and has come back on a later day than their
-- signup. "Maybe later" hides it for 30 days, and after two of those it stays
-- hidden. A follow-up email goes out a week after the card was first shown
-- if they never clicked through (app/api/cron/send-review-emails).

alter table profiles
  add column review_prompt_shown_at     timestamptz,
  add column review_prompt_clicked_at   timestamptz,
  add column review_prompt_dismissed_at timestamptz,
  add column review_prompt_dismiss_count integer not null default 0,
  add column review_email_sent_at       timestamptz;
