-- 20260704000009 only normalized casing for apps that already had case-colliding
-- duplicates at the time it ran. Rows that were the sole entry for their
-- (workspace_id, store, bundle_id) — e.g. old "us" rows written before
-- followAppAction started uppercasing — were left untouched. Since that
-- upsert's conflict target is the raw, case-sensitive
-- (workspace_id, store, bundle_id, country) key, re-following one of those
-- legacy lowercase rows today writes country: "US" and misses the existing
-- "us" row on conflict, creating a duplicate instead of updating it — the
-- same bug the prior migration fixed, just able to recur. This finishes the
-- job: merge any such duplicates (including ones that may have appeared
-- since), then uppercase every remaining row so all data matches what the
-- app has written since.

do $$
declare
  grp       record;
  keeper_id uuid;
  dup_id    uuid;
begin
  for grp in
    select workspace_id, store, bundle_id, upper(country) as ucountry,
           array_agg(id order by created_at) as ids
    from public.apps
    where country is not null
    group by workspace_id, store, bundle_id, upper(country)
    having count(*) > 1
  loop
    keeper_id := grp.ids[1];

    foreach dup_id in array grp.ids[2:array_length(grp.ids, 1)]
    loop
      update public.app_keywords set app_id = keeper_id
      where app_id = dup_id
        and not exists (
          select 1 from public.app_keywords k
          where k.app_id = keeper_id and k.keyword_id = app_keywords.keyword_id
        );

      update public.keyword_metrics set app_id = keeper_id
      where app_id = dup_id
        and not exists (
          select 1 from public.keyword_metrics k
          where k.app_id = keeper_id and k.keyword_id = keyword_metrics.keyword_id
        );

      update public.reviews set app_id = keeper_id
      where app_id = dup_id
        and not exists (
          select 1 from public.reviews r
          where r.app_id = keeper_id and r.store_review_id = reviews.store_review_id
        );

      update public.rating_snapshots set app_id = keeper_id
      where app_id = dup_id
        and not exists (
          select 1 from public.rating_snapshots s
          where s.app_id = keeper_id and s.recorded_on = rating_snapshots.recorded_on
        );

      update public.app_competitors set app_id = keeper_id
      where app_id = dup_id
        and not exists (
          select 1 from public.app_competitors c
          where c.app_id = keeper_id and c.store_id = app_competitors.store_id
        );

      delete from public.apps where id = dup_id;
    end loop;

    update public.apps set country = grp.ucountry where id = keeper_id;
  end loop;

  -- Singleton rows with no collision to merge — just normalize casing.
  update public.apps set country = upper(country)
  where country is not null and country <> upper(country);
end $$;
