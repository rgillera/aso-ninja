import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppIdentities, type IdentityApp } from "@/libs/store/app-identity";

type PageProps = { params: Promise<{ id: string }> };

// Opening an app re-checks it this often at most; the daily cron covers
// apps nobody opens.
const RESYNC_AFTER_MS = 60 * 60 * 1000;

// POST /api/apps/[id]/sync-identity — called by DashboardShell when an app is
// opened. Re-reads the app's name and icon from its store (see
// libs/store/app-identity.ts) and returns { changed: true } when the stored
// row was updated, so the client can refresh. The RLS-scoped select doubles
// as the access check; the write goes through the admin client because it
// updates the same listing in every workspace that follows it.
export async function POST(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("apps")
    .select("store, store_id, bundle_id, country, identity_synced_at")
    .eq("id", id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  if (app.identity_synced_at && Date.now() - Date.parse(app.identity_synced_at) < RESYNC_AFTER_MS) {
    return NextResponse.json({ changed: false });
  }

  const { changed } = await syncAppIdentities(createAdminClient(), [app as IdentityApp]);
  return NextResponse.json({ changed: changed > 0 });
}
