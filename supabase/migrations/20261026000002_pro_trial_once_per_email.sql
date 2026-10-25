-- One signup Pro trial per email, ever. pro_trial_ends_at
-- (20261025000001) already can't be reset on a live account, but deleting
-- the account cascades the subscriptions row, so signing up again with the
-- same email got a fresh 7 days. Claims live in their own table with no FK
-- to auth.users, so they outlive the account.
--
-- Emails are lowercased and lose any +tag, so name+1@x.com and
-- Name@x.com count as the same person.
create table pro_trial_claims (
  email      text primary key,
  claimed_at timestamptz not null default now()
);

-- No policies: only the security-definer trigger below touches it.
alter table pro_trial_claims enable row level security;

create or replace function normalize_trial_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(trim(p_email)), '\+[^@]*@', '@');
$$;

-- Runs inside handle_new_user's insert, after the auth.users row exists.
create or replace function claim_pro_trial()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_email text;
begin
  if new.pro_trial_ends_at is null then
    return new;
  end if;

  select public.normalize_trial_email(u.email) into v_email
  from auth.users u
  where u.id = new.user_id;

  -- No email (e.g. phone auth): nothing to key on, leave the trial.
  if v_email is null then
    return new;
  end if;

  insert into public.pro_trial_claims (email) values (v_email)
  on conflict (email) do nothing;

  if not found then
    new.pro_trial_ends_at := null;
  end if;

  return new;
end;
$$;

create trigger claim_pro_trial
  before insert on subscriptions
  for each row execute procedure claim_pro_trial();

-- Everyone who's had the trial so far.
insert into pro_trial_claims (email, claimed_at)
select public.normalize_trial_email(u.email), min(s.pro_trial_ends_at - interval '7 days')
from subscriptions s
join auth.users u on u.id = s.user_id
where s.pro_trial_ends_at is not null
  and u.email is not null
group by 1
on conflict (email) do nothing;
