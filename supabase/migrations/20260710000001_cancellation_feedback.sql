-- Captures why a user downgraded to Free, collected right before the
-- Stripe subscription is scheduled to cancel (see cancelSubscriptionAction).

create table cancellation_feedback (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  plan_id        uuid references plans(id),
  reason         text not null,
  recommendation text,
  created_at     timestamptz not null default now()
);

create index on cancellation_feedback (user_id);

alter table cancellation_feedback enable row level security;

create policy "users can record their own cancellation feedback"
  on cancellation_feedback for insert
  with check (user_id = auth.uid());
