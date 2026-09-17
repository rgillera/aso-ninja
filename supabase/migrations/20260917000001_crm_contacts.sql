-- Agent-side outreach CRM (imported from spreadsheets of prospective app
-- developers to contact about growth services). Unlike apps/keywords this
-- is not workspace-scoped — it's one shared list for the whole agent team.
-- Access is gated in the app layer via AGENT_EMAILS (see
-- libs/agents/is-agent-email.ts), the same pattern /admin uses for
-- SUPER_ADMIN_EMAILS: RLS below leaves no policies, so anon/authenticated
-- are denied by default and every read/write goes through the service-role
-- admin client from a server action that has already checked the allowlist.

create type crm_contact_status as enum (
  'new',
  'attempted_no_answer',
  'left_voicemail',
  'spoke_interested',
  'spoke_not_interested',
  'follow_up_scheduled',
  'closed_won',
  'closed_lost',
  'do_not_call'
);

create table crm_contacts (
  id                uuid primary key default gen_random_uuid(),
  app_name          text not null,
  phone             text,
  email             text,
  status            crm_contact_status not null default 'new',
  priority          text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  last_contact_at   date,
  next_follow_up_at date,
  notes             text,
  created_by        text,
  updated_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index crm_contacts_email_idx on crm_contacts (lower(email));
create index crm_contacts_app_name_idx on crm_contacts (lower(app_name));
create index crm_contacts_status_idx on crm_contacts (status);

alter table crm_contacts enable row level security;
