import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { testAppleCredential } from "./apple";
import { testGoogleCredential } from "./google";
import { syncAppDownloads } from "./sync";
import type { StoreCredential, OtherAppsResult } from "./types";

type UserClient = Awaited<ReturnType<typeof createClient>>;
type ConnectableApp = { id: string; name: string; store: string; store_id: string; workspace_id: string; bundle_id: string; country: string | null };

// requireListed: Apple only, see testAppleCredential. Google needs no
// equivalent: its report files are per package, so a bucket from another
// Play account 404s on its own.
export function testCredential(
  credential: StoreCredential, app: Pick<ConnectableApp, "store_id" | "country">, { requireListed = false } = {}
): Promise<{ valid: boolean; error?: string }> {
  // country is nullable (see libs/store-connections/sync.ts) — same US fallback.
  const countryCode = app.country ?? "US";
  return credential.provider === "apple"
    ? testAppleCredential(credential, app.store_id, countryCode, { requireListed })
    : testGoogleCredential(credential, app.store_id, countryCode);
}

export function credentialDisplayLabel(credential: StoreCredential): string {
  if (credential.provider === "apple") return `App Store Connect · Vendor #${credential.vendorNumber}`;
  try {
    const clientEmail = (JSON.parse(credential.serviceAccountJson) as { client_email?: string }).client_email;
    if (clientEmail) return `${clientEmail} · ${credential.bucketId}`;
  } catch {
    // Already validated as parseable JSON by testGoogleCredential — this
    // is just a display nicety, so a failure here isn't worth surfacing.
  }
  return `Cloud Storage · ${credential.bucketId}`;
}

// The workspace's other apps on the same store that have no credential yet,
// one row per bundle_id (connecting any country's row fans out to the rest,
// see connect_app_store_credential). Frozen apps are left out: they're over
// the plan's app limit and the rest of the product treats them as parked.
export async function findUnconnectedApps(supabase: UserClient, source: Pick<ConnectableApp, "workspace_id" | "store" | "bundle_id">): Promise<ConnectableApp[]> {
  const [{ data: apps }, { data: credentials }] = await Promise.all([
    supabase
      .from("apps")
      .select("id, name, store, store_id, workspace_id, bundle_id, country, status")
      .eq("workspace_id", source.workspace_id)
      .eq("store", source.store)
      .neq("bundle_id", source.bundle_id),
    supabase
      .from("app_store_credentials")
      .select("bundle_id")
      .eq("workspace_id", source.workspace_id)
      .eq("store", source.store),
  ]);

  const connected = new Set((credentials ?? []).map((c) => c.bundle_id));
  const byBundle = new Map<string, ConnectableApp>();
  for (const app of apps ?? []) {
    if (app.status === "frozen" || connected.has(app.bundle_id) || byBundle.has(app.bundle_id)) continue;
    byBundle.set(app.bundle_id, app);
  }
  return [...byBundle.values()];
}

// Kicks off the first sync immediately rather than leaving connections in
// "pending" (clock icon in the keyword tables) until the next daily cron
// tick — same admin-client path app/api/apps/[id]/sync-downloads/route.ts
// uses for the manual "Sync now" button. connect_app_store_credential just
// fanned the *connected* status out to every country sharing this app's
// workspace/store/bundle_id (one credential covers all of them), so every
// one of those siblings needs its own first sync here too — otherwise only
// the app_id actually submitted through this form gets fresh data, and every
// other country sits pending until the next cron tick. Best-effort per
// country: if a given country's report for the lookback window just isn't
// ready yet, syncAppDownloads leaves that one's status/last_synced_on
// untouched and the daily cron retries it, so a failure here must not fail
// the connect request itself or block its siblings.
export async function syncAllSiblingCountries(workspaceId: string, store: string, bundleId: string) {
  const admin = createAdminClient();
  const { data: siblings } = await admin
    .from("apps")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("store", store)
    .eq("bundle_id", bundleId);

  await Promise.all(
    (siblings ?? []).map((sibling) =>
      syncAppDownloads(sibling.id, admin).catch(() => {
        // Swallowed — see comment above.
      })
    )
  );
}

// Reuses one app's credential for every other unconnected app in the
// workspace on the same store (an App Store Connect key or Play service
// account normally covers the whole developer account). Each app is
// validated on its own first, so an app that lives in a different account
// is skipped and reported instead of being connected with a key that can't
// see it. Goes through the user-scoped RPC, so the owner/admin check still
// applies per app. Returns the bundles that connected, for the caller to
// sync (after the response, since a 30-day backfill per app adds up).
export async function connectOtherApps(
  supabase: UserClient, source: ConnectableApp, credential: StoreCredential
): Promise<OtherAppsResult & { bundleIds: string[] }> {
  const targets = await findUnconnectedApps(supabase, source);
  const displayLabel = credentialDisplayLabel(credential);

  const results = await Promise.all(
    targets.map(async (app) => {
      const validation = await testCredential(credential, app, { requireListed: true });
      if (!validation.valid) return { app, error: validation.error ?? "Couldn't validate these credentials for this app." };
      const { error } = await supabase.rpc("connect_app_store_credential", {
        p_app_id: app.id,
        p_credential: credential,
        p_display_label: displayLabel,
      });
      return { app, error: error?.message ?? null };
    })
  );

  return {
    connected: results.filter((r) => !r.error).map((r) => r.app.name),
    failed: results.filter((r) => r.error).map((r) => ({ name: r.app.name, error: r.error! })),
    bundleIds: results.filter((r) => !r.error).map((r) => r.app.bundle_id),
  };
}
