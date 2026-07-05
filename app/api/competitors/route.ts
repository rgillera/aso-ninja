import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { fetchStoreData } from "@/libs/store/load-benchmark";
import { daysSince } from "@/libs/store/benchmark-utils";
import { computeAsoScoreSummary } from "@/features/aso/reports/asoScore";

type CompetitorRow = { store_id: string; name: string; icon_url: string | null; developer: string | null };

function toCompetitorApp(row: CompetitorRow) {
  return { storeId: row.store_id, name: row.name, icon: row.icon_url ?? "", developer: row.developer ?? "" };
}

// Competitors are tracked by storeId only (no per-row store/country), so we
// assume they're on the same store platform and country as the primary app —
// the same assumption the "add competitor" search UI already makes. No peer
// benchmark is fetched per competitor (that would be an expensive N+1 of
// category-peer scrapes just for this table), so competitor scores fall back
// to the same fixed ASO reference thresholds used when no benchmark exists.
async function withScore(row: CompetitorRow, store: string, country: string) {
  const base = toCompetitorApp(row);
  const storeData = await fetchStoreData(store, row.store_id, row.store_id, country);
  const categoryPercents = computeAsoScoreSummary(storeData, base.name, null, store === "ios").map((s) => s.percent);
  const overallPercent = Math.round(categoryPercents.reduce((sum, p) => sum + p, 0) / categoryPercents.length);
  return {
    ...base,
    overallPercent,
    categoryPercents,
    title: storeData?.name || base.name,
    subtitle: storeData?.subtitle ?? "",
    description: storeData?.description ?? "",
    releaseNotes: storeData?.releaseNotes ?? "",
    screenshotUrls: storeData?.screenshotUrls ?? [],
    screenshotCount: storeData?.screenshotUrls.length ?? 0,
    hasPreviewVideo: !!storeData?.hasPreviewVideo,
    rating: storeData?.rating,
    ratingCount: storeData?.ratingCount,
    daysSinceUpdate: daysSince(storeData?.lastUpdatedAt),
    languageCount: storeData?.languageCount,
  };
}

// GET /api/competitors?appId=...
// or  /api/competitors?workspaceId=&bundleId=&store=&country=  (resolves an already-tracked
// app without creating one — an untracked/preview app simply has no saved competitors yet)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const bundleId = searchParams.get("bundleId");
  const store = searchParams.get("store");
  const country = searchParams.get("country");
  let appId = searchParams.get("appId") ?? undefined;

  const supabase = await createClient();

  if (!appId && workspaceId && bundleId && store) {
    const { data } = await supabase
      .from("apps")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("bundle_id", bundleId)
      .eq("store", store)
      .eq("country", (country ?? "us").toLowerCase())
      .maybeSingle();
    appId = data?.id;
  }

  if (!appId) return NextResponse.json({ appId: null, competitors: [] });

  const [{ data: appRow }, { data: rows }] = await Promise.all([
    supabase.from("apps").select("store, country").eq("id", appId).maybeSingle(),
    supabase
      .from("app_competitors")
      .select("store_id, name, icon_url, developer")
      .eq("app_id", appId)
      .order("created_at", { ascending: true }),
  ]);

  if (!appRow?.store) {
    return NextResponse.json({ appId, competitors: (rows ?? []).map(toCompetitorApp) });
  }

  const competitors = await Promise.all(
    (rows ?? []).map((row) => withScore(row, appRow.store, appRow.country ?? "us"))
  );

  return NextResponse.json({ appId, competitors });
}

// POST /api/competitors
// Body: { workspaceId, appId?, bundleId?, storeId?, appName?, iconUrl?, store?, country?, competitor }
// Mirrors /api/keywords/save's app-resolution: prefer the client-provided
// appId, otherwise upsert the primary app into existence from bundle info so
// a competitor can be added before the app has been explicitly followed.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    workspaceId, appId: clientAppId, bundleId, storeId, appName, iconUrl, store, country, competitor,
  } = body as {
    workspaceId: string;
    appId?: string;
    bundleId?: string;
    storeId?: string;
    appName?: string;
    iconUrl?: string;
    store?: string;
    country?: string;
    competitor?: { storeId: string; name: string; icon?: string; developer?: string };
  };

  if (!workspaceId || !competitor?.storeId || !competitor?.name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  let appId = clientAppId;

  if (!appId && bundleId && storeId && appName && store) {
    const normalCountry = (country ?? "us").toLowerCase();
    const { data: app, error: appErr } = await supabase
      .from("apps")
      .upsert(
        { workspace_id: workspaceId, name: appName, store, bundle_id: bundleId, store_id: storeId, icon_url: iconUrl ?? null, country: normalCountry, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,store,bundle_id,country" }
      )
      .select("id")
      .single();

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 403 });
    if (app) appId = app.id;
  }

  if (!appId) return NextResponse.json({ error: "Couldn't resolve the app to add this competitor to." }, { status: 400 });

  const { error } = await supabase.from("app_competitors").insert({
    app_id: appId,
    store_id: competitor.storeId,
    name: competitor.name,
    icon_url: competitor.icon || null,
    developer: competitor.developer || null,
  });

  if (error && error.code !== "23505") {
    // 23505 (unique violation) means it's already saved — treat as success
    // rather than surfacing a spurious error for a no-op re-add.
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ appId });
}

// DELETE /api/competitors
// Body: { appId, storeId }
export async function DELETE(request: NextRequest) {
  const { appId, storeId } = (await request.json()) as { appId?: string; storeId?: string };
  if (!appId || !storeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("app_competitors").delete().eq("app_id", appId).eq("store_id", storeId);

  return NextResponse.json({ ok: true });
}
