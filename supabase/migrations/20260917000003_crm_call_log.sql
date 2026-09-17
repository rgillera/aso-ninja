-- One row per Call-button click in the agent CRM (see logCallAction in
-- features/agents/actions.ts), used to compute each agent's "calls made
-- today" metric on the Contacts page. Fire-and-forget from the client — a
-- click doesn't wait on this insert before the tel: link is followed.
create table crm_call_log (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references crm_contacts(id) on delete cascade,
  agent_email text not null,
  called_at   timestamptz not null default now()
);

create index crm_call_log_agent_called_idx on crm_call_log (agent_email, called_at);

alter table crm_call_log enable row level security;
