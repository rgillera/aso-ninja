import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type MarketStatusMap = Record<string, boolean>;

// GET /api/market/status?workspaceId=...&storeIds=1,2,3
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const storeIds = (searchParams.get("storeIds") ?? "").split(",").filter(Boolean);

  if (!workspaceId || storeIds.length === 0) {
    return NextResponse.json({ statuses: {} }, { headers: { "Cache-Control": "no-store" } });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("market_app_status")
    .select("store_id, connected")
    .eq("workspace_id", workspaceId)
    .in("store_id", storeIds);

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
