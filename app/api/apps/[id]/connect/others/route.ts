import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { connectOtherApps, syncAllSiblingCountries } from "@/libs/store-connections/connect";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { OtherAppsResult, StoreCredential } from "@/libs/store-connections/types";

type PageProps = { params: Promise<{ id: string }> };

// Covers the other apps' first syncs, which run in after().
export const maxDuration = 300;

// POST /api/apps/[id]/connect/others — for an app that's already connected:
// reuse its stored credential for the workspace's other unconnected apps on
// the same store, without the user re-entering it. get_app_store_credential
// is service_role-only, so this route does the owner/admin check itself
// first (same as sync-downloads); the credential never leaves the server.
export async function POST(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: app } = await supabase
    .from("apps")
    .select("id, name, store, store_id, workspace_id, bundle_id, country")
    .eq("id", id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", app.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can connect store data." }, { status: 403 });
  }

  // Same Pro gate as connecting by hand — this creates new connections.
  const planState = await getWorkspacePlanState(app.workspace_id);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) {
    return NextResponse.json({ error: "Connecting real download data requires the Pro plan." }, { status: 403 });
  }

  const { data: credentialRaw } = await createAdminClient().rpc("get_app_store_credential", { p_app_id: id });
  if (!credentialRaw) return NextResponse.json({ error: "This app isn't connected." }, { status: 400 });

  const { bundleIds, ...otherApps } = await connectOtherApps(supabase, app, credentialRaw as StoreCredential);
  after(() => Promise.all(bundleIds.map((bundleId) => syncAllSiblingCountries(app.workspace_id, app.store, bundleId))));
  return NextResponse.json({ ok: true, otherApps } satisfies { ok: true; otherApps: OtherAppsResult });
}
