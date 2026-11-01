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
// libs/store/app-identity.ts) and returns { changed: true } when a stored
// row was updated, so the client can refresh. The app's other followed
// countries are synced along with it: My Apps shows one card per app using
// whichever country row comes first, so syncing only the opened country left
// that card on the old name. The RLS-scoped selects double as the access
// check; the write goes through the admin client because it updates the same
// listing in every workspace that follows it.
export async function POST(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("apps")
    .select("workspace_id, store, bundle_id")
    .eq("id", id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const { data: siblings } = await supabase
    .from("apps")
    .select("store, store_id, bundle_id, country, identity_synced_at")
    .eq("workspace_id", app.workspace_id)
    .eq("store", app.store)
    .eq("bundle_id", app.bundle_id);

  const due = (siblings ?? []).filter(
    (a) => !a.identity_synced_at || Date.now() - Date.parse(a.identity_synced_at) >= RESYNC_AFTER_MS
  );
  if (!due.length) return NextResponse.json({ changed: false });

  const { changed } = await syncAppIdentities(createAdminClient(), due as IdentityApp[]);
  return NextResponse.json({ changed: changed > 0 });
}
