-- Caps tracked keywords again (undoing 20260721000001_unlimited_paid_keywords.sql
-- for Pro and Pro+): Pro tracks up to 1,000 keywords and Pro+ up to 5,000,
-- matching features/subscription/plans.ts. Like the other limits, they count
-- every app_keywords link across all of the owner's workspaces
-- (20261101000001_count_keywords_per_app.sql). Enterprise stays unlimited.
--
-- Applies to existing subscribers too, by choice: anyone over the new cap has
-- their newest keywords paused (oldest stay active), the same way a downgrade
-- does, until they remove some or upgrade. Upgrading or removing keywords
-- already reconciles and unpauses them.

update plans set keyword_limit = 1000, updated_at = now() where slug = 'pro';
update plans set keyword_limit = 5000, updated_at = now() where slug = 'pro_plus';

do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from workspace_members where role = 'owner' loop
    perform reconcile_keyword_limits(v_owner);
  end loop;
end;
$$;
