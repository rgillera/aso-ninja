import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { computeShares } from "@/libs/keyword-downloads-apportionment";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

export type SavedKeyword = {
  term: string;
  volume: number;
  diff: number;
  chance: number;
  opportunity: number | null;
  relevancy: number | null;
  rank: number | null;
  intentThemeId: string | null;
  hasCachedMetrics: boolean;
  // Real total app downloads (from a connected App Store Connect / Play
  // Console account) apportioned across tracked keywords by volume + rank —
  // see the comment above the apportionment block below. null when this
  // keyword isn't ranked (no share attributed); always null when the app
  // isn't connected — see the top-level `downloadsConnection` field instead.
  estimatedDownloads: number | null;
  // Frozen when this keyword is beyond the workspace owner's current plan
  // limit (e.g. after a downgrade) — see reconcile_plan_limits in
  // supabase/migrations/20260713000001_plan_limit_reconciliation.sql.
  // Rank/volume stop refreshing while frozen, but past data is kept.
  frozen: boolean;
};

// GET /api/keywords/list?appId=...
// or, for an app previewed but not yet formally tracked (no internal id yet):
// GET /api/keywords/list?workspaceId=...&bundleId=...&store=...&country=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let appId = searchParams.get("appId") ?? "";

  const supabase = await createClient();

  if (!appId) {
    // Preview apps have no apps-table row reference on the client yet, but
    // /api/keywords/save resolves/creates one by this same natural key on
    // every add — look it up the same way so keywords saved while previewing
    // still load back, instead of the page silently staying empty.
    const workspaceId = searchParams.get("workspaceId") ?? "";
    const bundleId     = searchParams.get("bundleId") ?? "";
    const store        = searchParams.get("store") ?? "";
    const country       = (searchParams.get("country") ?? "us").toUpperCase();
    if (workspaceId && bundleId && store) {
      const { data } = await supabase
        .from("apps")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("store", store)
        .eq("bundle_id", bundleId)
        .eq("country", country)
        .maybeSingle();
      appId = data?.id ?? "";
    }

    // Still nothing — this country has never been followed/saved, so there's
    // no apps row to join app_store_connections against. But the bundle might
    // already be connected under a sibling country (one credential covers
    // every storefront — see the bundleHasCredential comment below), in which
    // case the UI should say "Follow to enable" even before a row exists,
    // rather than the more discouraging "Not connected".
    if (!appId && workspaceId && bundleId && store) {
      const planState = await getWorkspacePlanState(workspaceId);
      const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
      if (isPlanAtLeast(planSlug, "pro")) {
        const { data: credential } = await supabase
          .from("app_store_credentials")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("store", store)
          .eq("bundle_id", bundleId)
          .maybeSingle();
        if (credential) {
          return NextResponse.json({
            keywords: [],
            downloadsConnection: { connected: false, pending: false, bundleHasCredential: true },
          });
        }
      }
    }
  }

  if (!appId) return NextResponse.json({ keywords: [] });

  // Five separate queries — no direct FK exists between app_keywords and keyword_metrics
  const [akResult, metricsResult, connectionResult, downloadsResult, appResult] = await Promise.all([
    supabase
      .from("app_keywords")
      .select("keyword_id, keywords!inner(id, term, status)")
      .eq("app_id", appId)
      .order("added_at", { ascending: true }),
    supabase
      .from("keyword_metrics")
      .select("keyword_id, volume, diff, chance, opportunity, relevancy, relevancy_scored, rank, intent_theme_id")
      .eq("app_id", appId),
    supabase
      .from("app_store_connections")
      .select("status, last_synced_on")
      .eq("app_id", appId)
      .maybeSingle(),
    supabase
      .from("app_download_history")
      .select("downloads")
      .eq("app_id", appId)
      .order("recorded_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("apps").select("workspace_id, store, bundle_id").eq("id", appId).maybeSingle(),
  ]);

  if (akResult.error) return NextResponse.json({ keywords: [] }, { status: 500 });

  // Build metrics lookup by keyword_id
  const metricsMap = new Map<string, { volume: number; diff: number; chance: number; opportunity: number | null; relevancy: number | null; rank: number | null; intentThemeId: string | null }>();
  for (const m of metricsResult.data ?? []) {
    metricsMap.set(m.keyword_id, {
      volume:      m.volume,
      diff:        m.diff,
      chance:      m.chance,
      // relevancy/opportunity are `not null default 0`, so a row that was
      // never actually scored (below-tier, fast-mode, or the plan's
      // relevancy pool was exhausted) still holds 0/0, indistinguishable
      // from a genuine score of 0. `relevancy_scored` is the authoritative
      // marker — same rule app/api/keywords/metrics/route.ts already uses.
      opportunity: m.relevancy_scored ? m.opportunity : null,
      relevancy:   m.relevancy_scored ? m.relevancy   : null,
      rank:        m.rank ?? null,
      intentThemeId: m.intent_theme_id ?? null,
    });
  }

  const keywords: SavedKeyword[] = (akResult.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => {
      const kw = Array.isArray(row.keywords) ? row.keywords[0] : row.keywords;
      const term = kw?.term as string | undefined;
      if (!term) return null;
      const m = metricsMap.get(row.keyword_id);
      return {
        term,
        volume:           m?.volume      ?? 0,
        diff:             m?.diff        ?? 0,
        chance:           m?.chance      ?? 0,
        // null (as opposed to 0) means relevancy/opportunity were never
        // computed for this row — e.g. added while below Basic+ — so callers
        // can tell "not yet scored" apart from a genuine score of 0.
        opportunity:      m?.opportunity ?? null,
        relevancy:        m?.relevancy   ?? null,
        rank:             m?.rank        ?? null,
        intentThemeId:    m?.intentThemeId ?? null,
        hasCachedMetrics: !!m,
        frozen:           kw?.status === "frozen",
        estimatedDownloads: null, // filled in below once the full set's weights are known
      } satisfies SavedKeyword;
    })
    .filter(Boolean) as SavedKeyword[];

  // Est. Downloads is a Pro-and-up feature, same tier as Relevancy/
  // Opportunity (see app/api/keywords/metrics/route.ts) — stripped here
  // rather than left to the client, so a below-Pro workspace never receives
  // the computed values over the network at all.
  const planState = appResult.data?.workspace_id ? await getWorkspacePlanState(appResult.data.workspace_id) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const hasDownloadsAccess = isPlanAtLeast(planSlug, "pro");

  // See libs/keyword-downloads-apportionment.ts for what this split means
  // and why. Computed on the fly rather than cached — the inputs are
  // already loaded above and the arithmetic is O(n) over rows already in
  // hand, so there's nothing worth persisting.
  const latestTotal = downloadsResult.data?.downloads ?? null;
  if (hasDownloadsAccess && latestTotal !== null) {
    const shares = computeShares(keywords);
    keywords.forEach((k, i) => {
      k.estimatedDownloads = shares[i] > 0 ? Math.round(latestTotal * shares[i]) : null;
    });
  }

  const connected = connectionResult.data?.status === "connected";
  const pending = connected && !connectionResult.data?.last_synced_on;

  // If this specific country isn't connected, check whether the bundle
  // already has a credential under another country — one Apple/Google
  // account covers every storefront (app_store_credentials), so if one
  // exists, connect_app_store_credential / trg_auto_connect_new_country_app
  // (supabase/migrations/20260722000005_app_store_credentials.sql and
  // ...000006_app_store_credential_rpcs_v2.sql) wire this app's connection up
  // automatically the moment it's followed — no credentials to re-enter, so
  // the UI can say "Follow to enable" instead of "Not connected".
  let bundleHasCredential = false;
  if (!connected && hasDownloadsAccess && appResult.data?.workspace_id) {
    const { data: credential } = await supabase
      .from("app_store_credentials")
      .select("id")
      .eq("workspace_id", appResult.data.workspace_id)
      .eq("store", appResult.data.store)
      .eq("bundle_id", appResult.data.bundle_id)
      .maybeSingle();
    bundleHasCredential = !!credential;
  }

  const downloadsConnection = { connected, pending, bundleHasCredential };

  return NextResponse.json({ keywords, downloadsConnection });
}
