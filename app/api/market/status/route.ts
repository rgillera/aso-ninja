import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type MarketStatusMap = Record<string, boolean>;

// GET /api/market/status?workspaceId=...
//
// Deliberately not filtered by storeIds: App Explorer's "major" country
// filter merges up to 10 countries' charts (up to ~1000 unique apps), and
// passing that many storeIds as a query string routinely exceeded the
// server/proxy's URL length limit (414), which fetch() doesn't reject on —
// the failed .json() parse was silently swallowed by the caller's catch(),
// so the page just looked like every status had been forgotten. This table
// only ever holds rows a workspace has explicitly toggled, so scoping by
// workspace_id alone is both correct and small.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ statuses: {} }, { headers: { "Cache-Control": "no-store" } });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("market_app_status")
    .select("store_id, connected")
    .eq("workspace_id", workspaceId);

  const statuses: MarketStatusMap = {};
  for (const row of data ?? []) statuses[row.store_id] = row.connected;

  // Deliberately not cached, unlike the chart-data routes: this is the shared,
  // authoritative connected/unconnected state for the whole workspace, and a
  // stale copy here would show teammates a different view of who's connected.
  return NextResponse.json({ statuses }, { headers: { "Cache-Control": "no-store" } });
}

// POST /api/market/status
// Body: { workspaceId, storeId, store, connected }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workspaceId, storeId, store, connected } = body as {
    workspaceId?: string; storeId?: string; store?: string; connected?: boolean;
  };

  if (!workspaceId || !storeId || typeof connected !== "boolean") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("market_app_status")
    .upsert(
      {
        workspace_id: workspaceId,
        store: store === "android" ? "android" : "ios",
        store_id: storeId,
        connected,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,store,store_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
