-- Per-agent settings for the outreach CRM. Currently holds just the email an
-- agent wants used as the reply-to on the automated status-change emails
-- sent to contacts (see EMAIL_TRIGGER_STATUSES in features/agents/actions.ts)
-- — the actual "from" address stays the verified appaso.io sender; this is
-- only the reply-to, so a contact's reply lands in the right agent's inbox
-- instead of a shared one.
create table agent_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  reply_to_email text,
  updated_at     timestamptz not null default now()
);

alter table agent_settings enable row level security;
