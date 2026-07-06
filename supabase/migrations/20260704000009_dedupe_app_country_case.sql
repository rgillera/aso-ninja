-- followAppAction wrote apps.country as-is from whatever casing the search
-- result provided, and the unique constraint on
-- (workspace_id, store, bundle_id, country) is case-sensitive, so the same
-- app/country (e.g. "US" vs "us") could slip past it and get tracked twice.
-- The app layer now uppercases country before writing; this backfills
-- existing duplicates by merging any child rows onto one surviving "keeper"
-- row per (workspace_id, store, bundle_id, upper(country)) group and
-- normalizing that keeper's country casing.

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

      -- Any rows that lost the "not exists" race above are functionally
      -- redundant with the keeper's and go away with the duplicate app row.
      delete from public.apps where id = dup_id;
    end loop;

    update public.apps set country = grp.ucountry where id = keeper_id;
  end loop;
end $$;
