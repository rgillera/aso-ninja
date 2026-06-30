import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

type MetricsMap = Record<string, {
  volume: number; diff: number; chance: number;
  opportunity: number | null; relevancy: number | null; rank: number | null;
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

    // `ignoreDuplicates` + a fallback SELECT used to resolve this, but that's
    // a TOCTOU race: concurrent saves for a brand-new app (e.g. clicking
    // several keyword suggestion pills quickly) could all miss the insert
    // AND the fallback SELECT if it ran before the winner's insert committed,
    // leaving appId unresolved and silently dropping the app_keywords link.
    // DO UPDATE (vs DO NOTHING) makes Postgres return the row atomically
    // either way, so every concurrent caller resolves the same id.
    const { data: app } = await supabase
      .from("apps")
      .upsert(
        { workspace_id: workspaceId, name: appName, store, bundle_id: bundleId, store_id: storeId, icon_url: iconUrl ?? null, country: normalCountry, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,store,bundle_id,country" }
      )
      .select("id")
      .single();

    if (app) appId = app.id;
  }

  // 2. Upsert keyword terms
  const normalised = terms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (!normalised.length) return NextResponse.json({ appId });

  // DO UPDATE (the default, vs ignoreDuplicates' DO NOTHING) makes every row
  // come back from a single atomic upsert — same TOCTOU race as the apps
  // resolution above otherwise applies when two concurrent saves touch the
  // same term (e.g. it appears in two suggestion sections clicked close
  // together).
  const { data: keywordRows, error: kwErr } = await supabase
    .from("keywords")
    .upsert(
      normalised.map((term) => ({ workspace_id: workspaceId, term })),
      { onConflict: "workspace_id,term" }
    )
    .select("id, term");

  if (kwErr || !keywordRows?.length) return NextResponse.json({ appId });

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
