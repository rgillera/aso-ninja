import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAppKeywords } from "./client";
import type { AsaCredential, AsaConnectionStatus, AsaKeywordRow } from "./types";

// admin: a service-role client (createAdminClient()) — required because
// get_asa_credential is service_role-only (reads Vault), and asa_connections
// itself has no update/delete RLS policy (writes go through the connect/
// disconnect RPCs; status/last_error/last_synced_on updates here use the
// same trusted admin client the way libs/store-connections/sync.ts does).
type AdminClient = SupabaseClient;

export async function getAsaConnectionStatus(workspaceId: string, admin: AdminClient): Promise<AsaConnectionStatus> {
  const { data } = await admin
    .from("asa_connections")
    .select("status, display_label, last_error, last_synced_on")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return { connected: false };
  return {
    connected: true,
    status: data.status,
    displayLabel: data.display_label,
    lastError: data.last_error,
    lastSyncedOn: data.last_synced_on,
  };
}

export type SyncAppKeywordsResult =
  | { ok: true; rows: AsaKeywordRow[]; reportWarning?: string }
  | { ok: false; error: string };

// Live-fetches the given app's Apple Search Ads keywords on every call — no
// cache table for this first cut (see plan: it's a manually-visited page,
// not high traffic). Updates asa_connections' status/last_error/
// last_synced_on the same way syncAppDownloads updates app_store_connections,
// so a broken credential shows up as "Connection error" in the UI on the
// next status check even though this route doesn't re-read that column.
export async function syncAppKeywords(workspaceId: string, appId: string, admin: AdminClient): Promise<SyncAppKeywordsResult> {
  const { data: connection } = await admin
    .from("asa_connections")
    .select("ad_account_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!connection) return { ok: false, error: "Apple Search Ads isn't connected for this workspace." };

  const { data: credentialJson } = await admin.rpc("get_asa_credential", { p_workspace_id: workspaceId });
  if (!credentialJson) return { ok: false, error: "Apple Search Ads isn't connected for this workspace." };
  const credential = credentialJson as AsaCredential;

  const { data: app } = await admin.from("apps").select("store, store_id").eq("id", appId).maybeSingle();
  if (!app) return { ok: false, error: "App not found." };
  if (app.store !== "ios") return { ok: false, error: "Apple Search Ads only applies to iOS apps." };

  const result = await fetchAppKeywords(credential, connection.ad_account_id, app.store_id);

  if (result.ok) {
    await admin
      .from("asa_connections")
      .update({ status: "connected", last_error: null, last_synced_on: new Date().toISOString() })
      .eq("workspace_id", workspaceId);
    return result;
  }

  await admin
    .from("asa_connections")
    .update({ status: "error", last_error: result.error })
    .eq("workspace_id", workspaceId);
  return result;
}
