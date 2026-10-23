-- One row per ASO Certification exam attempt, pass or not, so the admin
-- panel can see who is taking the exam and how they do. `certifications`
-- still holds only passes (it backs the downloadable certificate); this
-- table is the attempt log. Like `certifications`, scores come from the
-- client (see features/certification/CertificationExam.tsx).
--
-- finished_at null = started but never submitted (closed the tab, or still
-- in progress). timed_out = the 45-minute clock ran out and auto-submitted.

create table certification_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  score       integer,
  total       integer not null,
  passed      boolean,
  timed_out   boolean not null default false
);

create index on certification_attempts (started_at desc);
create index on certification_attempts (user_id);

alter table certification_attempts enable row level security;

create policy "users can start their own certification attempts"
  on certification_attempts for insert
  with check (user_id = auth.uid());

-- Only an unfinished attempt can be written to, so a submitted result
-- can't be rewritten afterwards.
create policy "users can finish their own certification attempts"
  on certification_attempts for update
  using (user_id = auth.uid() and finished_at is null)
  with check (user_id = auth.uid());
