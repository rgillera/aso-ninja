-- Allow the same app to be tracked in multiple countries by including country in the unique key.
alter table apps drop constraint if exists apps_workspace_id_store_bundle_id_key;
alter table apps add constraint apps_workspace_id_store_bundle_id_country_key
  unique (workspace_id, store, bundle_id, country);
