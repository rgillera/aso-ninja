import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

type MetricsMap = Record<string, {
  volume: number; diff: number; chance: number;
  opportunity: number; relevancy: number; rank: number | null;
}>;

// POST /api/keywords/save
// Body: { terms, workspaceId, metrics?, bundleId?, storeId?, appName?, iconUrl?, store?, country? }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { terms, workspaceId, metrics, bundleId, storeId, appName, iconUrl, store, country } = body as {
    terms: string[];
    workspaceId: string;
    metrics?: MetricsMap;
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

  // 1. Upsert app → "follow" step
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
        { onConflict: "workspace_id,store,bundle_id,country", ignoreDuplicates: true }
      )
      .select("id")
      .single();

    if (!appErr && appRow) appId = appRow.id;
  }

  // 2. Upsert keyword terms
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

  // 3. Link to app
  if (appId) {
    await supabase
      .from("app_keywords")
      .upsert(
        keywordRows.map((kw) => ({ app_id: appId!, keyword_id: kw.id })),
        { onConflict: "app_id,keyword_id", ignoreDuplicates: true }
      );

    // 4. Persist metrics so initial page load can skip recomputing
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
