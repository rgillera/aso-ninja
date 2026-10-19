import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

const RECENT_LIMIT = 8;

export type InspectorRecent = { term: string; store: "ios" | "android"; country: string };

// GET /api/keywords/inspect/recent
// The signed-in user's latest Keyword Inspector searches, newest first.
// Written by /api/keywords/inspect. While an admin views as a user,
// createClient() is that user's session, so this returns their history.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("keyword_inspector_searches")
    .select("term, store, country")
    .eq("user_id", user.id)
    .order("searched_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recent: (data ?? []) as InspectorRecent[] });
}

// DELETE /api/keywords/inspect/recent
// Body: { term, store, country } removes one search, {} clears them all.
// Fails with the view-only error while an admin is viewing as the user.
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<InspectorRecent>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let query = supabase.from("keyword_inspector_searches").delete().eq("user_id", user.id);
  if (body.term && body.store && body.country) {
    query = query.eq("term", body.term).eq("store", body.store).eq("country", body.country);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
