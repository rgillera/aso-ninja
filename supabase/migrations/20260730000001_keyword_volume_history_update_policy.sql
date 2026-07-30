-- keyword_volume_history only had SELECT/INSERT policies (from when it was
-- keyword_popularity_snapshots), so the ON CONFLICT DO UPDATE half of its
-- upserts (same term/store/country/recorded_on written twice in one day)
-- was being rejected by RLS with 42501 ("USING expression"). Global
-- aggregated data, not user-owned, so this mirrors the existing
-- public-insert policy.

create policy "public update volume history"
  on keyword_volume_history for update
  using (true)
  with check (true);
