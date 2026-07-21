-- All paid plans get unlimited keyword tracking -- a hard keyword cap was a
-- recurring sales objection against competitors offering unlimited keywords.
-- Relevancy/opportunity scoring becomes the differentiator instead (see
-- 20260721000002_relevancy_pool_and_basic_removal.sql).
update plans set keyword_limit = null, updated_at = now() where slug in ('basic', 'pro', 'pro_plus');

-- Unfreeze any keywords that were paused under the old per-plan caps.
do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from workspace_members where role = 'owner' loop
    perform reconcile_keyword_limits(v_owner);
  end loop;
end;
$$;
