-- reviews previously only had SELECT + INSERT policies. Now that reviews are
-- actively synced via upsert (ON CONFLICT DO UPDATE, e.g. a reply gets added
-- later), the UPDATE path needs an explicit policy or it silently fails under
-- RLS. Same fix already applied to rating_snapshots.

drop policy if exists "workspace members can read reviews" on reviews;
drop policy if exists "service role can upsert reviews" on reviews;

create policy "workspace members can manage reviews"
  on reviews for all
  using (app_id in (
    select id from apps where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));
