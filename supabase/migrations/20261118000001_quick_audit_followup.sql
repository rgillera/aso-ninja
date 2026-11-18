-- Super Admin → Quick Audit "Follow-up" email (features/admin/AdminQuickAuditPage.tsx):
-- a fresh full audit run for the one final follow-up, minus everything the
-- first email already pitched, and the findings picked from it. Kept apart
-- from `result` / `selected` so the first email can still be rebuilt.
alter table quick_audits
  add column followup_result   jsonb,
  add column followup_selected text[] not null default '{}';
