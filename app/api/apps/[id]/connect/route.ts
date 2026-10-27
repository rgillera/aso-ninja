import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { normalizeBucketId } from "@/libs/store-connections/google";
import {
  connectOtherApps, credentialDisplayLabel, findUnconnectedApps, syncAllSiblingCountries, testCredential,
} from "@/libs/store-connections/connect";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { ConnectionStatus, OtherAppsResult, StoreCredential } from "@/libs/store-connections/types";

type PageProps = { params: Promise<{ id: string }> };

// Covers the first sync (30-day backfill) plus, with connectOtherApps, the
// other apps' syncs that run in after().
export const maxDuration = 300;

// GET /api/apps/[id]/connect — current connection status for the settings page.
// Status/last-synced/error stay per-country (app_store_connections, keyed by
// this app_id), but the credential itself — and its display label — are
// shared across every country this app is tracked in (app_store_credentials,
// keyed by workspace/store/bundle_id), so that's a second lookup.
export async function GET(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: connection }, { data: app }] = await Promise.all([
    supabase
      .from("app_store_connections")
      .select("status, last_error, last_synced_on")
      .eq("app_id", id)
      .maybeSingle(),
    supabase.from("apps").select("workspace_id, store, bundle_id").eq("id", id).maybeSingle(),
  ]);

  const unconnectedOtherApps = app ? (await findUnconnectedApps(supabase, app)).length : 0;

  if (!connection) return NextResponse.json({ connected: false, unconnectedOtherApps } satisfies ConnectionStatus);

  const { data: credential } = app
    ? await supabase
        .from("app_store_credentials")
        .select("display_label")
        .eq("workspace_id", app.workspace_id)
        .eq("store", app.store)
        .eq("bundle_id", app.bundle_id)
        .maybeSingle()
    : { data: null };

  return NextResponse.json({
    connected: true,
    status: connection.status,
    displayLabel: credential?.display_label ?? null,
    lastError: connection.last_error,
    lastSyncedOn: connection.last_synced_on,
    unconnectedOtherApps,
  } satisfies ConnectionStatus);
}

// POST /api/apps/[id]/connect
// Body shape depends on the app's store:
//   ios:     { issuerId, keyId, privateKey, vendorNumber }
//   android: { serviceAccountJson, bucketId }
// plus, for either, an optional connectOtherApps: true to reuse the same
// credential for the workspace's other unconnected apps on this store.
export async function POST(request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  const { data: app } = await supabase
    .from("apps")
    .select("id, name, store, store_id, workspace_id, bundle_id, country")
    .eq("id", id)
    .maybeSingle();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  // Est. Downloads is a Pro-and-up feature (same tier as Relevancy/
  // Opportunity) — checked here, not just in the display layer, so a
  // below-Pro workspace can't submit credentials at all.
  const planState = await getWorkspacePlanState(app.workspace_id);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) {
    return NextResponse.json({ error: "Connecting real download data requires the Pro plan." }, { status: 403 });
  }

  let credential: StoreCredential;
  if (app.store === "ios") {
    const { issuerId, keyId, privateKey, vendorNumber } = body as {
      issuerId?: string; keyId?: string; privateKey?: string; vendorNumber?: string;
    };
    if (!issuerId || !keyId || !privateKey || !vendorNumber) {
      return NextResponse.json({ error: "Missing Issuer ID, Key ID, private key, or Vendor Number." }, { status: 400 });
    }
    credential = { provider: "apple", issuerId, keyId, privateKey, vendorNumber };
  } else if (app.store === "android") {
    const { serviceAccountJson, bucketId: rawBucketId } = body as { serviceAccountJson?: string; bucketId?: string };
    const bucketId = normalizeBucketId(rawBucketId ?? "");
    if (!serviceAccountJson || !bucketId) {
      return NextResponse.json({ error: "Missing service account JSON or bucket ID." }, { status: 400 });
    }
    credential = { provider: "google", serviceAccountJson, bucketId };
  } else {
    return NextResponse.json({ error: "Unsupported store." }, { status: 400 });
  }

  const validation = await testCredential(credential, app);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Couldn't validate these credentials." }, { status: 400 });
  }

  const { error } = await supabase.rpc("connect_app_store_credential", {
    p_app_id: id,
    p_credential: credential,
    p_display_label: credentialDisplayLabel(credential),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await syncAllSiblingCountries(app.workspace_id, app.store, app.bundle_id);

  if (!(body as { connectOtherApps?: boolean }).connectOtherApps) return NextResponse.json({ ok: true });

  const { bundleIds, ...otherApps } = await connectOtherApps(supabase, app, credential);
  after(() => Promise.all(bundleIds.map((bundleId) => syncAllSiblingCountries(app.workspace_id, app.store, bundleId))));
  return NextResponse.json({ ok: true, otherApps } satisfies { ok: true; otherApps: OtherAppsResult });
}

// DELETE /api/apps/[id]/connect
export async function DELETE(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.rpc("disconnect_app_store_credential", { p_app_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}
