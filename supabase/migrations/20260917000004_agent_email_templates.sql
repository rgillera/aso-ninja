-- Admin-editable email template per trigger status (see
-- EMAIL_TRIGGER_STATUSES in features/agents/types.ts and
-- sendContactStatusEmail in features/agents/actions.ts). {{appName}} in
-- subject/body is substituted with the contact's App/Company name at send
-- time — see libs/email/contact-status-update.ts. Only rows for the 3
-- trigger statuses are ever written (enforced in updateEmailTemplateAction,
-- not by a check constraint, since the trigger set can grow later).
create table agent_email_templates (
  status     crm_contact_status primary key,
  subject    text not null,
  body       text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table agent_email_templates enable row level security;

-- Seeds today's shared generic copy as each status's starting template, so
-- behavior doesn't change until an admin actually edits one.
insert into agent_email_templates (status, subject, body) values
  ('follow_up_scheduled', 'Following up — {{appName}}', E'Hi,\n\nI wanted to follow up regarding {{appName}} — thanks for the conversation so far.\n\nFeel free to reply directly to this email if you have any questions or would like to continue the discussion.\n\nBest regards,\nThe AppASO Team'),
  ('spoke_interested',    'Following up — {{appName}}', E'Hi,\n\nI wanted to follow up regarding {{appName}} — thanks for the conversation so far.\n\nFeel free to reply directly to this email if you have any questions or would like to continue the discussion.\n\nBest regards,\nThe AppASO Team'),
  ('closed_won',          'Following up — {{appName}}', E'Hi,\n\nI wanted to follow up regarding {{appName}} — thanks for the conversation so far.\n\nFeel free to reply directly to this email if you have any questions or would like to continue the discussion.\n\nBest regards,\nThe AppASO Team');
