-- Super admin "view as" (startImpersonationAction in features/admin/actions.ts)
-- mints the target's session by verifying an admin-generated magic link,
-- which GoTrue records as a real sign-in: auth.users.last_sign_in_at jumps to
-- now, so the admin Users table's "Last login" / Active status reflected the
-- admin's visit instead of the user's own activity. The Auth admin API can't
-- set that column, so this puts the previous value back right after.
--
-- Only rewinds when the column still holds exactly the value the view-as
-- sign-in wrote (p_expected), so a genuine sign-in by the user that lands in
-- between is never overwritten.
create or replace function public.admin_restore_last_sign_in(
  p_user_id uuid,
  p_expected timestamptz,
  p_previous timestamptz
)
returns void
language sql security definer
set search_path = ''
as $$
  update auth.users
     set last_sign_in_at = p_previous
   where id = p_user_id
     and last_sign_in_at = p_expected;
$$;

-- Functions in public are executable by anon/authenticated by default —
-- this one writes auth.users, so lock it to the service role.
revoke execute on function public.admin_restore_last_sign_in(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_restore_last_sign_in(uuid, timestamptz, timestamptz) to service_role;
