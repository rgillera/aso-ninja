-- Track whether a user has ever started a trial, so the free trial can only
-- be granted once — otherwise a user could cancel and re-subscribe to keep
-- getting fresh 7-day trials indefinitely.
--
-- Lives on `subscriptions`, not `profiles`: subscriptions has no
-- user-writable RLS policy (only ever inserted by the security-definer
-- handle_new_user trigger or updated by the Stripe webhook's service-role
-- client), so a user can't just flip this back to false themselves the way
-- they could on a table they're allowed to update.

alter table subscriptions add column has_used_trial boolean not null default false;
