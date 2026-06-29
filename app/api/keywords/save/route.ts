import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/keywords/save
// Body: { terms, workspaceId, bundleId?, storeId?, appName?, iconUrl?, store?, country? }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    terms,
    workspaceId,
    bundleId,
    storeId,
    appName,
    iconUrl,
    store,
    country,
  } = body as {
    terms: string[];
    workspaceId: string;
    bundleId?: string;
    storeId?: string;
    appName?: string;
    iconUrl?: string;
    store?: string;
    country?: string;
  };

  if (!terms?.length || !workspaceId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Upsert app if we have enough info → this is the "follow" step
  let appId: string | undefined;
  if (bundleId && storeId && appName && store) {
    const { data: appRow, error: appErr } = await supabase
      .from("apps")
      .upsert(
        {
          workspace_id: workspaceId,
          name: appName,
          store,
          bundle_id: bundleId,
          store_id: storeId,
          icon_url: iconUrl ?? null,
          country: (country ?? "us").toLowerCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,store,bundle_id,country", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (!appErr && appRow) appId = appRow.id;
  }

  // 2. Upsert keyword terms scoped to workspace
  const normalised = terms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (!normalised.length) return NextResponse.json({ appId });

  const { data: keywordRows, error: kwErr } = await supabase
    .from("keywords")
    .upsert(
      normalised.map((term) => ({ workspace_id: workspaceId, term })),
      { onConflict: "workspace_id,term", ignoreDuplicates: true }
    )
    .select("id, term");

  if (kwErr || !keywordRows?.length) return NextResponse.json({ appId });

  // 3. Link keywords to the app
  if (appId) {
    await supabase
      .from("app_keywords")
      .upsert(
        keywordRows.map((kw) => ({ app_id: appId!, keyword_id: kw.id })),
        { onConflict: "app_id,keyword_id", ignoreDuplicates: true }
      );
  }

  return NextResponse.json({ appId });
}
