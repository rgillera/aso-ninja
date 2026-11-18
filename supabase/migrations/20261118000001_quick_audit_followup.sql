-- Super Admin → Quick Audit "Follow-up" email: the findings picked for the one
-- final follow-up, kept apart from `selected` (the first email's picks) so the
-- follow-up never repeats what was already sent.
alter table quick_audits add column followup_selected text[] not null default '{}';
