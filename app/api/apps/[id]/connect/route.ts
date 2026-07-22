import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { testAppleCredential } from "@/libs/store-connections/apple";
import { testGoogleCredential } from "@/libs/store-connections/google";
import { syncAppDownloads } from "@/libs/store-connections/sync";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { AppleStoreCredential, GoogleStoreCredential, ConnectionStatus } from "@/libs/store-connections/types";

type PageProps = { params: Promise<{ id: string }> };

// GET /api/apps/[id]/connect — current connection status for the settings page.
export async function GET(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("app_store_connections")
    .select("status, display_label, last_error, last_synced_on")
    .eq("app_id", id)
    .maybeSingle();

  if (!data) return NextResponse.json({ connected: false } satisfies ConnectionStatus);

  return NextResponse.json({
    connected: true,
    status: data.status,
    displayLabel: data.display_label,
    lastError: data.last_error,
    lastSyncedOn: data.last_synced_on,
  } satisfies ConnectionStatus);
}

// POST /api/apps/[id]/connect
// Body shape depends on the app's store:
//   ios:     { issuerId, keyId, privateKey, vendorNumber }
//   android: { serviceAccountJson, bucketId }
export async function POST(request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  const { data: app } = await supabase
    .from("apps")
    .select("id, store, store_id, workspace_id, country")
    .eq("id", id)
    .maybeSingle();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  // country is nullable (see libs/store-connections/sync.ts) — same US fallback.
  const countryCode = app.country ?? "US";

  // Est. Downloads is a Pro-and-up feature (same tier as Relevancy/
  // Opportunity) — checked here, not just in the display layer, so a
  // below-Pro workspace can't submit credentials at all.
  const planState = await getWorkspacePlanState(app.workspace_id);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) {
    return NextResponse.json({ error: "Connecting real download data requires the Pro plan." }, { status: 403 });
  }

  if (app.store === "ios") {
    const { issuerId, keyId, privateKey, vendorNumber } = body as {
      issuerId?: string; keyId?: string; privateKey?: string; vendorNumber?: string;
    };
    if (!issuerId || !keyId || !privateKey || !vendorNumber) {
      return NextResponse.json({ error: "Missing Issuer ID, Key ID, private key, or Vendor Number." }, { status: 400 });
    }

    const credential: AppleStoreCredential = { provider: "apple", issuerId, keyId, privateKey, vendorNumber };
    const validation = await testAppleCredential(credential, app.store_id, countryCode);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? "Couldn't validate these credentials." }, { status: 400 });
    }

    const { error } = await supabase.rpc("connect_app_store_credential", {
      p_app_id: id,
      p_credential: credential,
      p_display_label: `App Store Connect · Vendor #${vendorNumber}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    await syncNow(id);
    return NextResponse.json({ ok: true });
  }

  if (app.store === "android") {
    const { serviceAccountJson, bucketId } = body as { serviceAccountJson?: string; bucketId?: string };
    if (!serviceAccountJson || !bucketId) {
      return NextResponse.json({ error: "Missing service account JSON or bucket ID." }, { status: 400 });
    }

    const credential: GoogleStoreCredential = { provider: "google", serviceAccountJson, bucketId };
    const validation = await testGoogleCredential(credential, app.store_id, countryCode);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? "Couldn't validate these credentials." }, { status: 400 });
    }

    let displayLabel = `Cloud Storage · ${bucketId}`;
    try {
      const clientEmail = (JSON.parse(serviceAccountJson) as { client_email?: string }).client_email;
      if (clientEmail) displayLabel = `${clientEmail} · ${bucketId}`;
    } catch {
      // Already validated as parseable JSON by testGoogleCredential — this
      // is just a display nicety, so a failure here isn't worth surfacing.
    }

    const { error } = await supabase.rpc("connect_app_store_credential", {
      p_app_id: id,
      p_credential: credential,
      p_display_label: displayLabel,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    await syncNow(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported store." }, { status: 400 });
}

// Kicks off the first sync immediately rather than leaving the connection in
// "pending" (clock icon in the keyword tables) until the next daily cron
// tick — same admin-client path app/api/apps/[id]/sync-downloads/route.ts
// uses for the manual "Sync now" button. Best-effort: if the provider's
// report for the lookback window just isn't ready yet, syncAppDownloads
// leaves status/last_synced_on untouched and the daily cron retries, so a
// failure here must not fail the connect request itself.
async function syncNow(appId: string) {
  try {
    await syncAppDownloads(appId, createAdminClient());
  } catch {
    // Swallowed — see comment above.
  }
}

// DELETE /api/apps/[id]/connect
export async function DELETE(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.rpc("disconnect_app_store_credential", { p_app_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}
