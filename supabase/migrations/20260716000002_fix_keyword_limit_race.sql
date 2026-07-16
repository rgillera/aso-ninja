-- enforce_keyword_limit() recounts active keywords *after* the current
-- statement's rows are already inserted, then rejects if that count exceeds
-- the plan. But two concurrent /api/keywords/save requests for the same
-- owner (e.g. adding two different keyword rows within milliseconds of each
-- other) run as separate transactions under READ COMMITTED: each can read
-- the count before the other's insert has committed, so both see
-- "count <= limit" and both commit, letting the pooled total land one (or
-- more) over the plan's keyword_limit. Serializing on a per-owner advisory
-- lock before counting forces the second transaction to wait for the first
-- to commit (or roll back), so its recount always reflects the first
-- transaction's insert.
create or replace function enforce_keyword_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_owner        uuid;
  v_plan         public.plans;
  v_count        integer;
begin
  for v_workspace_id in select distinct workspace_id from inserted_keywords loop
    if (select status from public.workspaces where id = v_workspace_id) = 'frozen' then
      raise exception 'This workspace is paused because it exceeds your plan''s workspace limit. Upgrade to restore access.';
    end if;

    v_owner := public.get_workspace_owner(v_workspace_id);
    if v_owner is null then
      continue;
    end if;

    v_plan := public.get_effective_plan(v_owner);

    if v_plan.keyword_limit is not null then
      perform pg_advisory_xact_lock(hashtext('keyword_limit:' || v_owner::text));

      select count(*) filter (where k.status = 'active') into v_count
      from public.keywords k
      join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
      where wm.user_id = v_owner;

      if v_count > v_plan.keyword_limit then
        raise exception 'Keyword limit reached for your plan (% keywords). Upgrade to track more.', v_plan.keyword_limit;
      end if;
    end if;
  end loop;

  return null;
end;
$$;
