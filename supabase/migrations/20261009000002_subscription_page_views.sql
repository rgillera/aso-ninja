-- How many times each user opened /dashboard/subscription, for the super
-- admin Users table. Fed by SubscriptionPageViewTracker (features/activity)
-- once per page open; kept on user_activity rather than its own table since
-- it's the same one-row-per-user usage summary.
alter table user_activity
  add column subscription_page_views integer not null default 0;

create or replace function public.record_subscription_page_view()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  -- An existing row's last_active_at/active_seconds are left alone: opening
  -- the page isn't a minute of use (ActivityHeartbeat counts that).
  insert into public.user_activity as ua (user_id, subscription_page_views, last_active_at)
  values (v_user, 1, now())
  on conflict (user_id) do update
     set subscription_page_views = ua.subscription_page_views + 1;
end;
$$;

revoke execute on function public.record_subscription_page_view() from public, anon;
grant execute on function public.record_subscription_page_view() to authenticated;
