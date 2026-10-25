-- One-time "try Pro free" email to everyone who can still start the opt-in
-- trial (20261026000003), sent in batches by /api/cron/send-trial-offer-emails.
alter table profiles
  add column pro_trial_offer_sent_at timestamptz;

-- Next batch to email: confirmed email, not emailed yet, still eligible.
-- Service role only.
create or replace function pro_trial_offer_recipients(p_limit integer)
returns table (user_id uuid)
language sql
stable
security definer set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.pro_trial_offer_sent_at is null
    and p.email_confirmed_at is not null
    and (public.pro_trial_eligible_subscription(p.id)).user_id is not null
  order by p.email_confirmed_at
  limit p_limit;
$$;

revoke execute on function pro_trial_offer_recipients(integer) from public, anon, authenticated;
