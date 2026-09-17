-- Left Voicemail joins the trigger set — "just left you a voicemail,
-- following up by email too" is a very common outreach pattern. See
-- EMAIL_TRIGGER_STATUSES in features/agents/types.ts. Its default copy
-- references the voicemail directly rather than reusing the generic
-- "thanks for the conversation so far" line, which doesn't fit a call that
-- went to voicemail.
insert into agent_email_templates (status, subject, body) values (
  'left_voicemail',
  'Following up — {{appName}}',
  E'Hi,\n\nI just left you a voicemail regarding {{appName}} — wanted to follow up here as well in case email is easier to reach you.\n\nFeel free to reply directly to this email if you have any questions or would like to continue the discussion.\n\nBest regards,\nThe AppASO Team'
);
