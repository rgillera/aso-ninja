-- Bug: /api/keywords/remove only deletes the app_keywords link, leaving the
-- shared `keywords` row (and its 'active' status) in place forever, since
-- keywords are workspace-scoped and can be referenced by multiple apps. The
-- quota-enforcement trigger pools active keyword rows per owner, so a
-- "removed" keyword kept counting against the plan limit indefinitely,
-- and reconcile_keyword_limits never got a chance to free the slot because
-- its trigger only fires on `keywords` deletes, not `app_keywords` deletes.
--
-- Fix: once a keyword has no app_keywords referencing it left in the
-- workspace, it's no longer tracked by anything, so delete it. That delete
-- fires the existing trg_reconcile_after_keyword_delete trigger, which
-- re-runs reconcile_keyword_limits and frees the slot. This also fixes app
-- deletion, whose FK cascade into app_keywords hit the same gap.
create or replace function delete_orphaned_keywords()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.keywords k
  where k.id in (select distinct keyword_id from deleted_app_keywords)
    and not exists (
      select 1 from public.app_keywords ak where ak.keyword_id = k.id
    );
  return null;
end;
$$;

create trigger trg_delete_orphaned_keywords
  after delete on app_keywords
  referencing old table as deleted_app_keywords
  for each statement
  execute function delete_orphaned_keywords();

-- One-time backfill: clean up keywords that were already orphaned by this
-- bug before the trigger existed, then reconcile every owner so anyone
-- wrongly stuck at their limit gets their slots back immediately.
delete from keywords k
where not exists (select 1 from app_keywords ak where ak.keyword_id = k.id);

do $$
declare
  v_owner uuid;
begin
  for v_owner in select distinct user_id from workspace_members where role = 'owner' loop
    perform reconcile_keyword_limits(v_owner);
  end loop;
end;
$$;
