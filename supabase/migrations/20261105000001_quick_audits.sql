-- History for Super Admin → Quick Audit (features/admin/AdminQuickAuditPage.tsx).
-- One row per audit run: the full result (every finding, not just the three
-- picked), plus the picks/first name/Calendly link last copied into an email
-- so the exact email can be rebuilt later.
create table quick_audits (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references auth.users(id) on delete set null,
  url         text not null,
  store       text not null check (store in ('ios', 'android')),
  store_id    text not null,
  country     text not null,
  app_name    text not null,
  result      jsonb not null,
  selected    text[] not null default '{}',
  first_name  text not null default '',
  calendly    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on quick_audits (created_at desc);

-- No policies: only the service-role client in features/admin/actions.ts
-- (behind requireSuperAdmin) reads or writes it.
alter table quick_audits enable row level security;
