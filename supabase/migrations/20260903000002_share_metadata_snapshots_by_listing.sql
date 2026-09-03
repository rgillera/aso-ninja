-- Share metadata history across every workspace tracking the same real
-- store listing, instead of siloing it per-workspace `apps` row.
--
-- Previously metadata_snapshots was keyed by app_id — one per-workspace
-- "follow" record — so two workspaces tracking the identical real app each
-- built up Timeline history from zero, even if the other had been tracked
-- for months. Re-key by the listing's real-world identity (store, country,
-- store_id/bundle_id) instead: a workspace that follows an app someone else
-- on the platform already tracks now instantly inherits its full history,
-- the way AppTweak/Sensor Tower-style tools appear to have history from
-- day one (they're serving previously-collected data, not fetching the
-- store's past — that's still impossible, see recordMetadataSnapshot).

alter table metadata_snapshots
  add column store     app_store not null default 'ios',
  add column store_id  text not null default '',
  add column bundle_id text not null default '',
  add column country   text not null default '';
alter table metadata_snapshots alter column store drop default;

-- Backfill identity columns from the apps row each existing snapshot was
-- recorded through.
update metadata_snapshots ms
set store     = a.store,
    store_id  = coalesce(a.store_id, ''),
    bundle_id = coalesce(a.bundle_id, ''),
    country   = coalesce(a.country, 'US')
from apps a
where a.id = ms.app_id;

-- One snapshot per real listing per day, regardless of which workspace's
-- app row triggered the fetch (replaces the old per-app_id uniqueness).
alter table metadata_snapshots drop constraint metadata_snapshots_app_id_recorded_on_key;
alter table metadata_snapshots add constraint metadata_snapshots_identity_day_key
  unique (store, country, store_id, bundle_id, recorded_on);

create index on metadata_snapshots (store, country, store_id, bundle_id, recorded_on desc);

-- app_id can no longer uniquely identify a snapshot (many apps rows across
-- many workspaces can map to the same identity) — keep it only as a
-- "first recorded via" breadcrumb. Unfollowing that one app must not delete
-- history other workspaces are now sharing, so relax the FK from CASCADE
-- to SET NULL.
alter table metadata_snapshots drop constraint metadata_snapshots_app_id_fkey;
alter table metadata_snapshots alter column app_id drop not null;
alter table metadata_snapshots add constraint metadata_snapshots_app_id_fkey
  foreign key (app_id) references apps(id) on delete set null;

-- Visibility now follows listing identity: any workspace member who tracks
-- the same real app can read (and record into) its shared history, not
-- just whichever workspace's app_id happens to be attached to a row.
drop policy "workspace members can manage metadata snapshots" on metadata_snapshots;
create policy "workspace members can manage metadata snapshots"
  on metadata_snapshots for all
  using (
    exists (
      select 1 from apps a
      join workspace_members wm on wm.workspace_id = a.workspace_id
      where wm.user_id = auth.uid()
        and a.store = metadata_snapshots.store
        and coalesce(a.country, 'US') = metadata_snapshots.country
        and coalesce(a.store_id, '') = metadata_snapshots.store_id
        and coalesce(a.bundle_id, '') = metadata_snapshots.bundle_id
    )
  );
