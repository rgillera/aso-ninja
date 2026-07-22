-- Bug: unfollowing an app (features/app/actions.ts deleteAppAction) does a
-- hard `delete from apps`, which cascades into app_store_connections via its
-- FK — but the Vault secret referenced by vault_secret_id has no FK pointing
-- back to it, so the encrypted credential (.p8 key / service-account JSON)
-- would be left orphaned in Vault forever if nothing else cleaned it up.
--
-- Fix: a statement-level trigger on app_store_connections itself, so Vault
-- cleanup happens no matter which path deletes the row — the
-- disconnect_app_store_credential RPC (20260722000003_app_store_connection_rpcs.sql)
-- relies on this trigger rather than deleting the secret itself, precisely so
-- this cascade path isn't a second, easily-missed place that has to remember
-- to do it (same "hook the actual removal, not one caller of it" fix already
-- applied in 20260717000003_orphaned_keyword_cleanup.sql).
--
-- Vault (as shipped in this Supabase version) only provides
-- vault.create_secret / vault.update_secret — there is no vault.delete_secret
-- function. vault.secrets is a real base table underneath those wrappers
-- (confirmed via \d vault.secrets — relkind 'r', not a view), so removal is
-- a plain delete against it.
create or replace function cleanup_app_store_connection_secrets()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from vault.secrets
  where id in (
    select vault_secret_id from deleted_app_store_connections where vault_secret_id is not null
  );
  return null;
end;
$$;

create trigger trg_cleanup_app_store_connection_secrets
  after delete on app_store_connections
  referencing old table as deleted_app_store_connections
  for each statement
  execute function cleanup_app_store_connection_secrets();
