import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchTopCharts } from "@/libs/store/appstore";
import { fetchAndroidTopCharts } from "@/libs/store/googleplay";
import { IOS_CATEGORIES, ANDROID_CATEGORIES } from "@/libs/categories";
import type { ChartApp } from "@/libs/contracts";

// Hobby tier caps functions at 60s. Single-country (US) x every category x
// every chart type x both stores is ~196 combos — most runs should clear
// that in one shot, but it's still time-boxed and resumable via a persisted
// cursor in case a slow day doesn't finish, rather than assuming it always will.
// (Was multi-country at one point — same app shows up in most countries'
// charts anyway, so that traded a lot of crawl time for a thin regional long
// tail. Bumping CRAWL_COUNTRIES back up is the one-line way to revisit that.)
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000; // leaves ~15s buffer under the 60s hard cap
const CRAWL_COUNTRIES = ["US"];

const IOS_CHARTS = ["free", "paid", "grossing", "new"] as const;
const ANDROID_CHARTS = ["free", "paid", "grossing"] as const;

type Combo = { store: "ios" | "android"; country: string; chart: string; category: string | null };

// Deterministic order — must stay stable across runs, since the cursor is
// just a numeric offset into this list. Adding/removing categories or
// countries shifts everything after the change, which just means some
// combos get skipped or repeated once; not worth guarding against.
//
// iOS and Android combos are interleaved rather than run as two back-to-back
// blocks: Android's list() call is ~5x faster per combo than iOS's RSS-fetch-
// plus-ratings-lookup, so a plain "all iOS then all Android" order meant iOS
// alone took the first ~6 days before Android was touched at all. Alternating
// means every day's batch makes progress on both, even though Android still
// races ahead and finishes its half of the cycle much sooner.
function buildCombos(): Combo[] {
  const combos: Combo[] = [];
  for (const country of CRAWL_COUNTRIES) {
    const iosCombos: Combo[] = [];
    for (const chart of IOS_CHARTS) {
      for (const category of [null, ...IOS_CATEGORIES.map((c) => c.id)]) {
        iosCombos.push({ store: "ios", country, chart, category });
      }
    }
    const androidCombos: Combo[] = [];
    for (const chart of ANDROID_CHARTS) {
      for (const category of [null, ...ANDROID_CATEGORIES.map((c) => c.id)]) {
        androidCombos.push({ store: "android", country, chart, category });
      }
    }
    const max = Math.max(iosCombos.length, androidCombos.length);
    for (let i = 0; i < max; i++) {
      if (iosCombos[i]) combos.push(iosCombos[i]);
      if (androidCombos[i]) combos.push(androidCombos[i]);
    }
  }
  return combos;
}

function toRow(app: ChartApp, combo: Combo) {
  return {
    store: app.store,
    store_id: app.storeId,
    bundle_id: app.bundleId ?? null,
    name: app.name,
    developer: app.developer,
    icon_url: app.iconUrl,
    price: app.price,
    price_label: app.priceLabel,
    genre: app.genre,
    url: app.url,
    rating: app.rating,
    rating_count: app.ratingCount,
    app_updated_at: app.lastUpdatedAt ? new Date(app.lastUpdatedAt).toISOString() : null,
    last_rank: app.rank,
    last_chart: combo.chart,
    last_category: combo.category ?? "all",
    last_country: combo.country,
    last_seen_at: new Date().toISOString(),
  };
}

async function fetchCombo(combo: Combo): Promise<ChartApp[] | null> {
  if (combo.store === "ios") {
    return fetchTopCharts({ country: combo.country, device: "iphone", chart: combo.chart as "free" | "paid" | "grossing" | "new", genreId: combo.category, limit: 100 });
  }
  return fetchAndroidTopCharts({ country: combo.country.toLowerCase(), category: combo.category, chart: combo.chart as "free" | "paid" | "grossing", limit: 200 });
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional cap for manual/test invocations, on top of the time budget —
  // the real cron trigger never sets this.
  const { searchParams } = new URL(req.url);
  const maxCombos = Number(searchParams.get("maxCombos")) || Infinity;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const combos = buildCombos();

  const { data: state } = await supabase.from("market_crawl_state").select("cursor").eq("id", 1).single();
  const startCursor = state?.cursor ?? 0;

  const start = Date.now();
  let processed = 0;
  let failures = 0;
  let rowsUpserted = 0;

  while (processed < maxCombos && processed < combos.length && Date.now() - start < TIME_BUDGET_MS) {
    const combo = combos[(startCursor + processed) % combos.length];
    processed++;

    const apps = await fetchCombo(combo);
    if (!apps) { failures++; continue; }
    if (apps.length === 0) continue;

    const { error } = await supabase
      .from("market_apps")
      .upsert(apps.map((a) => toRow(a, combo)), { onConflict: "store,store_id" });
    if (error) failures++; else rowsUpserted += apps.length;
  }

  const newCursor = (startCursor + processed) % combos.length;
  await supabase.from("market_crawl_state").update({ cursor: newCursor, updated_at: new Date().toISOString() }).eq("id", 1);

  return NextResponse.json({
    processed,
    failures,
    rowsUpserted,
    cursor: { from: startCursor, to: newCursor, totalCombos: combos.length },
  });
}
