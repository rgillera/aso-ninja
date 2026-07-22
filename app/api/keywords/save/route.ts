import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppDownloads } from "@/libs/store-connections/sync";

type MetricsMap = Record<string, {
  volume: number; diff: number; chance: number;
  opportunity: number | null; relevancy: number | null; rank: number | null;
  intentThemeId?: string | null;
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
    const normalCountry = (country ?? "us").toUpperCase();

    // `ignoreDuplicates` + a fallback SELECT used to resolve this, but that's
    // a TOCTOU race: concurrent saves for a brand-new app (e.g. clicking
    // several keyword suggestion pills quickly) could all miss the insert
    // AND the fallback SELECT if it ran before the winner's insert committed,
    // leaving appId unresolved and silently dropping the app_keywords link.
    // DO UPDATE (vs DO NOTHING) makes Postgres return the row atomically
    // either way, so every concurrent caller resolves the same id.
    const { data: app, error: appErr } = await supabase
      .from("apps")
      .upsert(
        { workspace_id: workspaceId, name: appName, store, bundle_id: bundleId, store_id: storeId, icon_url: iconUrl ?? null, country: normalCountry, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,store,bundle_id,country" }
      )
      .select("id")
      .single();

    // A rejected upsert here (e.g. the workspace's plan app limit trigger)
    // must stop the request — otherwise the keyword upsert below would still
    // run and burn the workspace's keyword quota on terms for an app that
    // was never actually tracked.
    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 403 });
    if (app) {
      appId = app.id;

      // Same rare-path fixup as followAppAction (features/app/actions.ts): a
      // country touched for the first time here (rather than via the ＋Follow
      // button) can get auto-marked 'connected' by
      // trg_auto_connect_new_country_app if this bundle's already connected
      // under another country — one credential covers every storefront. Left
      // alone, that row would sit pending (clock icon) until the next daily
      // cron tick since nothing else kicks off its first sync. Only fires
      // when a fresh apps row was just resolved above, not on every save.
      const admin = createAdminClient();
      const { data: connection } = await admin
        .from("app_store_connections")
        .select("status, last_synced_on")
        .eq("app_id", appId!)
        .maybeSingle();
      if (connection?.status === "connected" && !connection.last_synced_on) {
        await syncAppDownloads(appId!, admin).catch(() => {
          // Best-effort — see app/api/apps/[id]/connect/route.ts's
          // syncAllSiblingCountries for why a sync failure here (report not
          // ready yet) must not fail the surrounding request.
        });
      }
    }
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

  // A rejected upsert here (e.g. the workspace's plan keyword limit trigger)
  // must be surfaced as an error — otherwise the client's optimistically
  // added row (already in UI state before this response comes back) never
  // gets rolled back, since a 200 with no `error` field looks like success.
  if (kwErr) return NextResponse.json({ error: kwErr.message }, { status: 403 });
  if (!keywordRows?.length) return NextResponse.json({ appId });

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
            // Coalesced rather than passed through raw: keyword_metrics.relevancy/
            // opportunity are `not null default 0`, so a plan that leaves these
            // null (below Pro, or fast-mode — see app/api/keywords/metrics/route.ts)
            // would otherwise fail this whole batched upsert with a NOT NULL
            // violation — silently, since the error isn't checked — and take
            // every other keyword in the same save call down with it.
            opportunity: m.opportunity ?? 0,
            relevancy:   m.relevancy ?? 0,
            // Marks whether this row was actually scored (vs. left at the
            // NOT NULL default above). Every row in this array must carry the
            // same keys — PostgREST rejects a bulk upsert otherwise ("All
            // object keys must match") — so this stays unconditional rather
            // than a term-by-term conditional spread.
            relevancy_scored: m.relevancy !== null && m.relevancy !== undefined,
            rank:        m.rank ?? null,
            // Undefined (metrics computed before intent classification existed,
            // e.g. fast-mode or old cache rows) must not stomp a previously
            // persisted/manually-assigned theme with null on upsert.
            ...(m.intentThemeId !== undefined ? { intent_theme_id: m.intentThemeId } : {}),
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
