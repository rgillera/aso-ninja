-- Tracks when a user's email got confirmed and when their welcome email
-- went out, so a cron job can send it a few minutes after confirmation
-- instead of racing Supabase's own "confirm your email" message.

alter table profiles
  add column email_confirmed_at   timestamptz,
  add column welcome_email_sent_at timestamptz;

-- Backfill: existing users are already past onboarding, don't email them.
update profiles p
set email_confirmed_at = u.email_confirmed_at,
    welcome_email_sent_at = now()
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null;

create or replace function sync_profile_email_confirmed()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
    set email_confirmed_at = new.email_confirmed_at
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update on auth.users
  for each row execute procedure sync_profile_email_confirmed();
