import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/keywords/remove
// Body: { appId, terms: string[] }
//
// Untracks keywords from an app (deletes the app_keywords link), mirroring
// the upsert done by /api/keywords/save. The keyword row itself and its
// history are left intact — other apps/workspaces may still reference it.
export async function POST(request: NextRequest) {
  const { appId, terms } = await request.json() as { appId?: string; terms?: string[] };
  if (!appId || !terms?.length) return NextResponse.json({ ok: true });

  const normalised = terms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (!normalised.length) return NextResponse.json({ ok: true });

  const supabase = await createClient();

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
