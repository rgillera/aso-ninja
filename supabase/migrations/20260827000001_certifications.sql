-- Records a passed ASO Certification exam attempt, so the certification
-- page can show "you're certified" and the PDF can be redownloaded without
-- retaking the exam. Scoring itself still happens client-side (see
-- features/certification/CertificationExam.tsx) — this table is a record
-- of the outcome, not an authoritative grading source.

create table certifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  certificate_id text not null unique,
  score          integer not null,
  total          integer not null,
  issued_at      timestamptz not null default now()
);

create index on certifications (user_id, issued_at desc);

alter table certifications enable row level security;

create policy "users can view their own certifications"
  on certifications for select
  using (user_id = auth.uid());

create policy "users can record their own certifications"
  on certifications for insert
  with check (user_id = auth.uid());
