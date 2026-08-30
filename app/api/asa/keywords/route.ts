import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppKeywords } from "@/libs/asa-connections/service";

// GET /api/asa/keywords?appId=... — live-pulls this app's Apple Search Ads
// campaigns/ad groups/keywords + bid + last-30-days spend/performance.
// Read-only for any workspace member (no owner/admin restriction — matches
// /api/keywords/list's access model; only connecting/disconnecting the
// credential itself is owner/admin-gated, in /api/asa/connect).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId") ?? "";
  if (!appId) return NextResponse.json({ error: "Missing appId" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS already scopes this to apps in workspaces the user belongs to — a
  // non-member's appId simply comes back null, same as every other
  // app-scoped route in this codebase.
  const { data: app } = await supabase.from("apps").select("id, workspace_id").eq("id", appId).maybeSingle();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  // get_asa_credential is service_role-only (it reads Vault), so the actual
  // fetch has to go through the admin client — membership was already
  // confirmed above via the RLS-scoped lookup.
  const admin = createAdminClient();
  const result = await syncAppKeywords(app.workspace_id, appId, admin);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ keywords: result.rows, reportWarning: result.reportWarning ?? null });
}
