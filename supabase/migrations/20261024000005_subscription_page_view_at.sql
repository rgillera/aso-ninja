-- When each user last opened /dashboard/subscription, for the super admin
-- Engagement page's Recently active table. Views before this migration only
-- have a count, so the column stays null for them until their next open.
alter table user_activity
  add column last_subscription_page_view_at timestamptz;

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
  insert into public.user_activity as ua (user_id, subscription_page_views, last_subscription_page_view_at, last_active_at, visit_count, active_days)
  values (v_user, 1, now(), now(), 1, 1)
  on conflict (user_id) do update
     set subscription_page_views = ua.subscription_page_views + 1,
         last_subscription_page_view_at = now();
end;
$$;
