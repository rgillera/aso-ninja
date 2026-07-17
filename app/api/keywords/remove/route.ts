import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/keywords/remove
// Body: { appId, terms: string[] }
// or, for an app previewed but not yet formally tracked (no internal id yet):
// Body: { workspaceId, bundleId, store, country, terms: string[] }
//
// Untracks keywords from an app (deletes the app_keywords link), mirroring
// the upsert done by /api/keywords/save. The keyword row itself and its
// history are left intact as long as another app still references it; once
// this was the last reference, a DB trigger (trg_delete_orphaned_keywords)
// deletes the now-unreferenced keyword row so it stops counting against the
// plan's keyword limit.
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    appId?: string; terms?: string[];
    workspaceId?: string; bundleId?: string; store?: string; country?: string;
  };
  let { appId } = body;
  const { terms, workspaceId, bundleId, store, country } = body;
  if (!terms?.length) return NextResponse.json({ ok: true });

  const normalised = terms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (!normalised.length) return NextResponse.json({ ok: true });

  const supabase = await createClient();

  if (!appId && workspaceId && bundleId && store) {
    // Same natural-key lookup /api/keywords/list uses for preview apps — an
    // app removed from a previewed app's table never got an `id` from
    // ActiveAppContext, so without this the delete silently no-ops and the
    // keyword reappears on the next load.
    const { data } = await supabase
      .from("apps")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("store", store)
      .eq("bundle_id", bundleId)
      .eq("country", (country ?? "us").toUpperCase())
      .maybeSingle();
    appId = data?.id ?? undefined;
  }

  if (!appId) return NextResponse.json({ ok: true });

  const { data: keywordRows } = await supabase
    .from("keywords")
    .select("id")
    .in("term", normalised);

  const keywordIds = (keywordRows ?? []).map((k) => k.id);
  if (!keywordIds.length) return NextResponse.json({ ok: true });

  await supabase
    .from("app_keywords")
    .delete()
    .eq("app_id", appId)
    .in("keyword_id", keywordIds);

  return NextResponse.json({ ok: true });
}
