-- Relevancy & opportunity scoring becomes a paid feature: Free's pool goes
-- 40 -> 0. With a 0 pool, /api/keywords/metrics treats the workspace as
-- having no relevancy access (strips both scores, scores nothing new) and
-- enforce_relevancy_limit() rejects any new score.
--
-- Free owners who already scored keywords get those rows frozen by
-- reconcile_relevancy_limits (score kept, read back as unscored), so
-- upgrading unfreezes them with no re-scoring. Signup trials are untouched:
-- get_effective_plan() still gives an active trial its own 200 pool, and
-- the /api/cron/pro-trial reconcile freezes those scores once it ends.
update plans set relevancy_limit = 0, updated_at = now() where slug = 'free';

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct wm.user_id
    from public.workspace_members wm
    where wm.role = 'owner'
      and (public.get_effective_plan(wm.user_id)).slug = 'free'
  loop
    perform public.reconcile_relevancy_limits(v_user_id);
  end loop;
end;
$$;
