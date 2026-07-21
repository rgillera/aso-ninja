-- Hard-enforce the relevancy/opportunity pool (relevancy_limit), closing the
-- same TOCTOU race the app-layer check in app/api/keywords/metrics/route.ts
-- can't fully close on its own: two concurrent /api/keywords/save requests
-- for the same owner can both read "budget available" before either
-- commits, both send relevancy_scored: true, and land the pooled total over
-- the plan's limit.
--
-- Unlike enforce_keyword_limit/enforce_app_limit, this does NOT reject the
-- write -- a keyword must still get tracked (volume/chance/rank) even once
-- the pool is exhausted, only the *score* itself is denied. So this is a
-- BEFORE ROW trigger that silently coerces the row back to its "never
-- scored" shape (relevancy_scored = false, relevancy/opportunity = 0 --
-- the same NOT NULL default a below-Pro/fast-mode row already uses) instead
-- of raising an exception.
--
-- keyword_metrics is written via upsert (onConflict "app_id,keyword_id" in
-- app/api/keywords/save/route.ts), so this covers both paths: BEFORE INSERT
-- fires for a genuinely new row, and BEFORE UPDATE fires when ON CONFLICT
-- resolves an existing row -- Postgres fires each event's own BEFORE ROW
-- trigger appropriately, and both are able to mutate NEW.
create or replace function enforce_relevancy_limit()
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
  -- Already counted in a previous save (or never being scored by this write
  -- at all) -- nothing to check.
  if not new.relevancy_scored then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.relevancy_scored then
    return new;
  end if;

  select workspace_id into v_workspace_id from public.apps where id = new.app_id;
  if v_workspace_id is null then
    return new;
  end if;

  v_owner := public.get_workspace_owner(v_workspace_id);
  if v_owner is null then
    return new;
  end if;

  v_plan := public.get_effective_plan(v_owner);

  if v_plan.relevancy_limit is not null then
    perform pg_advisory_xact_lock(hashtext('relevancy_limit:' || v_owner::text));

    select count(*) into v_count
    from public.keyword_metrics km
    join public.keywords k on k.id = km.keyword_id
    join public.workspace_members wm on wm.workspace_id = k.workspace_id and wm.role = 'owner'
    where wm.user_id = v_owner and km.relevancy_scored and km.id <> new.id;

    if v_count >= v_plan.relevancy_limit then
      new.relevancy_scored := false;
      new.relevancy         := 0;
      new.opportunity       := 0;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_relevancy_limit
  before insert or update on keyword_metrics
  for each row
  execute function enforce_relevancy_limit();
