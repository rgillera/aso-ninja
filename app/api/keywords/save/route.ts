import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

type MetricsMap = Record<string, {
  volume: number; diff: number; chance: number;
  opportunity: number; relevancy: number; rank: number | null;
}>;

// POST /api/keywords/save
// Body: { terms, workspaceId, metrics?, appId?, bundleId?, storeId?, appName?, iconUrl?, store?, country? }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { terms, workspaceId, metrics, appId: clientAppId, bundleId, storeId, appName, iconUrl, store, country } = body as {
    terms: string[];
    workspaceId: string;
    metrics?: MetricsMap;
    appId?: string;
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

  // 1. Resolve appId — prefer client-provided ID, then upsert, then lookup
  let appId: string | undefined = clientAppId;

  if (!appId && bundleId && storeId && appName && store) {
    const normalCountry = (country ?? "us").toLowerCase();

    // Try to insert; ignoreDuplicates means existing row is not returned
    const { data: newApp } = await supabase
      .from("apps")
      .upsert(
        { workspace_id: workspaceId, name: appName, store, bundle_id: bundleId, store_id: storeId, icon_url: iconUrl ?? null, country: normalCountry, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,store,bundle_id,country", ignoreDuplicates: true }
      )
      .select("id")
      .single();

    if (newApp) {
      appId = newApp.id;
    } else {
      // App already existed — fetch its ID
      const { data: existingApp } = await supabase
        .from("apps")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("store", store)
        .eq("bundle_id", bundleId)
        .eq("country", normalCountry)
        .single();
      if (existingApp) appId = existingApp.id;
    }
  }

  // 2. Upsert keyword terms
  const normalised = terms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (!normalised.length) return NextResponse.json({ appId });

  const { data: insertedRows, error: kwErr } = await supabase
    .from("keywords")
    .upsert(
      normalised.map((term) => ({ workspace_id: workspaceId, term })),
      { onConflict: "workspace_id,term", ignoreDuplicates: true }
    )
    .select("id, term");

  if (kwErr) return NextResponse.json({ appId });

  // ignoreDuplicates means already-existing keywords aren't returned — fetch them
  let keywordRows = insertedRows ?? [];
  const insertedTerms = new Set(keywordRows.map((r) => r.term));
  const missingTerms  = normalised.filter((t) => !insertedTerms.has(t));

  if (missingTerms.length) {
    const { data: existingRows } = await supabase
      .from("keywords")
      .select("id, term")
      .eq("workspace_id", workspaceId)
      .in("term", missingTerms);
    keywordRows = [...keywordRows, ...(existingRows ?? [])];
  }

  if (!keywordRows.length) return NextResponse.json({ appId });

  // 3. Link all keywords to the app
  if (appId) {
    await supabase
      .from("app_keywords")
      .upsert(
        keywordRows.map((kw) => ({ app_id: appId!, keyword_id: kw.id })),
        { onConflict: "app_id,keyword_id", ignoreDuplicates: true }
      );

    // 4. Persist metrics so initial page load skips recomputing
    if (metrics) {
      const metricsRows = keywordRows
        .filter((kw) => metrics[kw.term])
        .map((kw) => {
          const m = metrics[kw.term];
          return {
            app_id:      appId!,
            keyword_id:  kw.id,
            volume:      m.volume,
            diff:        m.diff,
            chance:      m.chance,
            opportunity: m.opportunity,
            relevancy:   m.relevancy,
            rank:        m.rank ?? null,
            updated_at:  new Date().toISOString(),
          };
        });

      if (metricsRows.length) {
        await supabase
          .from("keyword_metrics")
          .upsert(metricsRows, { onConflict: "app_id,keyword_id" });
      }
    }
  }

  return NextResponse.json({ appId });
}
