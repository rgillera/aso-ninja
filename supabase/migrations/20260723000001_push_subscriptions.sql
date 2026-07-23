-- Web Push subscriptions for the /mobile monitoring PWA. Unlike
-- app_store_credentials, a subscription holds no third-party secret (just a
-- device's public push endpoint), so a plain owner-scoped RLS policy is
-- enough — no Vault, no SECURITY DEFINER RPCs needed for reads/writes here.
-- The refresh-keywords cron fans out pushes using the service-role client
-- (libs/supabase/admin.ts), which already bypasses RLS.
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now()
);

create index on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "users manage their own push subscriptions"
  on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
