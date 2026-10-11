import type { AppEstimate, ChartApp, StoreData } from "@/libs/contracts";
import { fetchTopChartIds } from "@/libs/store/appstore";
import { fetchAndroidTopCharts } from "@/libs/store/googleplay";
import { ANDROID_CATEGORY_MAP } from "@/libs/categories";

// Rough monthly downloads and gross revenue for apps we don't own, in the
// spirit of Sensor Tower / AppMagic estimates. Neither store discloses these,
// so every number here is modeled from public signals, in order of trust:
//
// 1. Overall chart rank (Top Free / Paid / Grossing). Chart position follows
//    a power law, value ≈ V1 × rank^-b (Garg & Telang, "Inferring App Demand
//    from Publicly Available Data": b ≈ 0.86 for iOS grossing). The download
//    curves are flatter than the paper's 0.94, tuned so the US iOS #100 free
//    app lands near the ~5K/day commonly reported for that position.
// 2. Category chart rank: the same curve scaled down by the category's share
//    of the store, and capped at the overall chart's floor (an app missing
//    from the overall chart can't out-earn its last entry).
// 3. Not charting: downloads from public lifetime counters averaged over the
//    app's age (iOS: storefront rating count × downloads-per-rating; Play:
//    global install count × this country's share), revenue from downloads ×
//    revenue-per-download. Still capped by the chart floors it's missing from.
//
// The constants below are hand-set from public market-size reports, NOT
// fitted to ground truth. Expect any single figure to be off by 2-5x: good
// for telling a 10K app from a 1M one, not for quoting. Calibrating against
// connected apps' real sales reports is the way to tighten them.

type Store = "ios" | "android";
type Chart = "free" | "paid" | "grossing";

// V1 = the #1 app's daily value in the US (downloads, or gross USD spend).
const CURVES: Record<Store, Record<Chart, { v1Daily: number; exponent: number }>> = {
  ios: {
    free: { v1Daily: 150_000, exponent: 0.75 },
    paid: { v1Daily: 4_000, exponent: 0.8 },
    grossing: { v1Daily: 1_500_000, exponent: 0.86 },
  },
  android: {
    free: { v1Daily: 200_000, exponent: 0.75 },
    paid: { v1Daily: 1_500, exponent: 0.8 },
    grossing: { v1Daily: 500_000, exponent: 0.9 },
  },
};

// Market size relative to the US on the same store. Covers the countries App
// Explorer offers (MAJOR_/OTHER_MARKET_COUNTRIES); anything else gets no
// estimate rather than a made-up one.
const REVENUE_SCALE: Record<Store, Record<string, number>> = {
  ios: {
    US: 1, JP: 0.45, GB: 0.12, DE: 0.1, KR: 0.1, CA: 0.07, AU: 0.06, FR: 0.06,
    IT: 0.035, ES: 0.03, SA: 0.025, BR: 0.02, NL: 0.02, IN: 0.015, MX: 0.015,
    SE: 0.015, SG: 0.012, TR: 0.012, ID: 0.008, PH: 0.006,
  },
  android: {
    US: 1, JP: 0.9, KR: 0.6, DE: 0.2, GB: 0.12, BR: 0.12, FR: 0.1, IN: 0.08,
    CA: 0.07, AU: 0.06, ID: 0.06, IT: 0.06, MX: 0.06, ES: 0.05, SA: 0.05,
    TR: 0.05, NL: 0.03, PH: 0.03, SE: 0.02, SG: 0.02,
  },
};
const DOWNLOAD_SCALE: Record<Store, Record<string, number>> = {
  ios: {
    US: 1, JP: 0.35, GB: 0.15, BR: 0.12, IN: 0.12, DE: 0.1, FR: 0.1, CA: 0.1,
    MX: 0.1, AU: 0.07, ES: 0.07, IT: 0.07, KR: 0.06, TR: 0.06, SA: 0.06,
    ID: 0.05, PH: 0.05, NL: 0.03, SE: 0.02, SG: 0.02,
  },
  android: {
    US: 1, IN: 4, ID: 1.4, BR: 1.3, MX: 0.8, TR: 0.6, PH: 0.5, DE: 0.35,
    FR: 0.3, ES: 0.3, IT: 0.3, JP: 0.25, GB: 0.25, KR: 0.2, SA: 0.2, CA: 0.15,
    AU: 0.12, NL: 0.06, SE: 0.04, SG: 0.03,
  },
};

// Fallback-only constants.
const IOS_DOWNLOADS_PER_RATING = 70;
// The US's share of Play's global installs; other countries scale off it
// via DOWNLOAD_SCALE (so India ≈ 20%).
const ANDROID_US_INSTALL_SHARE = 0.05;
// Gross spend per download for apps outside Top Grossing, US. Scaled per
// country by that market's revenue-to-downloads ratio. Deliberately low:
// many big non-grossing apps (Meta, delivery, banking) monetize off-store,
// and anything earning more would usually be in Top Grossing already.
const REVENUE_PER_DOWNLOAD: Record<Store, number> = { ios: 0.05, android: 0.015 };
const GAMES_RPD_MULTIPLIER = 2;
// Listings that declare no in-app purchases can still earn from ads.
const NO_IAP_RPD_MULTIPLIER = 0.3;

// A category chart's #1 is worth about this share of the overall #1.
function categoryShare(store: Store, genreId: string): { downloads: number; revenue: number } {
  if (genreId === "6014" || genreId === "GAME") return { downloads: 0.35, revenue: 0.55 };
  if (/^7\d{3}$/.test(genreId) || genreId.startsWith("GAME_")) return { downloads: 0.03, revenue: 0.05 };
  return store === "ios" || genreId in ANDROID_CATEGORY_MAP ? { downloads: 0.04, revenue: 0.03 } : { downloads: 0, revenue: 0 };
}

function isGames(genreId: string | null): boolean {
  return !!genreId && (genreId === "6014" || genreId === "GAME" || /^7\d{3}$/.test(genreId) || genreId.startsWith("GAME_"));
}

// Play's list() falls back to an unfiltered chart for a category id it
// doesn't know, which would be misread as a category chart.
function isChartableGenre(store: Store, genreId: string | null): genreId is string {
  if (!genreId) return false;
  return store === "ios" ? /^\d+$/.test(genreId) : genreId in ANDROID_CATEGORY_MAP || genreId.startsWith("GAME_");
}

function curveMonthly(store: Store, chart: Chart, rank: number): number {
  const { v1Daily, exponent } = CURVES[store][chart];
  return v1Daily * Math.pow(rank, -exponent) * 30;
}

// Rank position by store id, plus the chart's length (its floor rank).
type ChartRanks = { ranks: Map<string, number>; floor: number };
type ChartSet = Partial<Record<Chart, ChartRanks>>;

async function fetchChartRanks(store: Store, country: string, chart: Chart, genreId: string | null): Promise<ChartRanks | undefined> {
  const ids = store === "ios"
    ? await fetchTopChartIds(country, chart, genreId)
    : (await fetchAndroidTopCharts({ country: country.toLowerCase(), category: genreId, chart, limit: 200 }))?.map((a) => a.storeId) ?? null;
  if (!ids?.length) return undefined;
  return { ranks: new Map(ids.map((id, i) => [id, i + 1])), floor: ids.length };
}

// All three charts, overall or for one category. Every fetcher underneath is
// cached for 6h, and the chart a caller is browsing is usually already warm.
async function fetchChartSet(store: Store, country: string, genreId: string | null): Promise<ChartSet> {
  const charts: Chart[] = ["free", "paid", "grossing"];
  const results = await Promise.all(charts.map((c) => fetchChartRanks(store, country, c, genreId)));
  return Object.fromEntries(charts.map((c, i) => [c, results[i]]));
}

export function supportsEstimates(store: Store, country: string): boolean {
  return !!REVENUE_SCALE[store][country.toUpperCase()];
}

type Signals = {
  store: Store;
  country: string;
  ids: string[]; // every id the app may be listed under (store id, Play package name)
  price: number;
  genreId: string | null;
  ratingCount?: number | null; // iOS: this storefront's count
  installs?: number | null; // Play: global lifetime installs
  releasedAt?: number | null;
  offersIAP?: boolean | null;
};

function rankIn(chart: ChartRanks | undefined, ids: string[]): number | null {
  if (!chart) return null;
  for (const id of ids) {
    const r = chart.ranks.get(id);
    if (r) return r;
  }
  return null;
}

const CATEGORY_LABEL = "in category";

function estimate(s: Signals, overall: ChartSet, category: ChartSet | null): AppEstimate {
  const country = s.country.toUpperCase();
  const dlScale = DOWNLOAD_SCALE[s.store][country];
  const revScale = REVENUE_SCALE[s.store][country];
  const share = s.genreId ? categoryShare(s.store, s.genreId) : { downloads: 0, revenue: 0 };

  // The chart a missing app would have to beat. Overall always applies; the
  // category one only when it was actually fetched for this app's genre.
  function ceiling(chart: Chart, perChartShare: number): number {
    let cap = Infinity;
    const o = overall[chart];
    if (o) cap = curveMonthly(s.store, chart, o.floor + 1);
    const c = category?.[chart];
    if (c && perChartShare > 0) cap = Math.min(cap, curveMonthly(s.store, chart, c.floor + 1) * perChartShare);
    return cap;
  }

  // From a chart rank, overall first, then category. null = not in either.
  function fromCharts(chart: Chart, perChartShare: number, label: string): { value: number; basis: string } | null {
    const r = rankIn(overall[chart], s.ids);
    if (r) return { value: curveMonthly(s.store, chart, r), basis: `#${r} ${label}` };
    const cr = rankIn(category?.[chart], s.ids);
    if (cr && perChartShare > 0) {
      const o = overall[chart];
      const raw = curveMonthly(s.store, chart, cr) * perChartShare;
      return { value: o ? Math.min(raw, curveMonthly(s.store, chart, o.floor + 1)) : raw, basis: `#${cr} ${label} ${CATEGORY_LABEL}` };
    }
    return null;
  }

  // Downloads
  const dlChart: Chart = s.price > 0 ? "paid" : "free";
  const dlLabel = s.price > 0 ? "Top Paid" : "Top Free";
  let downloads: number | null = null;
  let downloadsBasis = "Not enough public data";
  const charted = fromCharts(dlChart, share.downloads, dlLabel);
  if (charted) {
    downloads = charted.value * dlScale;
    downloadsBasis = charted.basis;
  } else {
    const ageMonths = s.releasedAt ? Math.max(1, (Date.now() - s.releasedAt) / (30 * 24 * 60 * 60 * 1000)) : null;
    let usEquivalent: number | null = null;
    if (s.store === "ios" && s.ratingCount && ageMonths) {
      // Already this storefront's count, so no country scaling.
      downloads = (s.ratingCount * IOS_DOWNLOADS_PER_RATING) / ageMonths;
      usEquivalent = downloads / dlScale;
      downloadsBasis = `Modeled from ${s.ratingCount.toLocaleString("en-US")} ratings since ${new Date(s.releasedAt!).getFullYear()}`;
    } else if (s.store === "android" && s.installs && ageMonths) {
      downloads = (s.installs * ANDROID_US_INSTALL_SHARE * dlScale) / ageMonths;
      usEquivalent = downloads / dlScale;
      downloadsBasis = `Modeled from ${s.installs.toLocaleString("en-US")}+ global installs since ${new Date(s.releasedAt!).getFullYear()}`;
    }
    if (usEquivalent !== null) {
      const cap = ceiling(dlChart, share.downloads);
      if (usEquivalent > cap) downloads = cap * dlScale;
    }
  }

  // Revenue
  let revenue: number | null = null;
  let revenueBasis = "Not enough public data";
  const grossing = fromCharts("grossing", share.revenue, "Top Grossing");
  if (grossing) {
    revenue = grossing.value * revScale;
    revenueBasis = grossing.basis;
  } else if (downloads !== null) {
    let rpd = REVENUE_PER_DOWNLOAD[s.store] * (revScale / dlScale);
    if (isGames(s.genreId)) rpd *= GAMES_RPD_MULTIPLIER;
    if (s.offersIAP === false) rpd *= NO_IAP_RPD_MULTIPLIER;
    const usEquivalent = (downloads * (rpd + s.price)) / revScale;
    revenue = Math.min(usEquivalent, ceiling("grossing", share.revenue)) * revScale;
    revenueBasis = s.price > 0 ? "Modeled from estimated downloads and price" : "Modeled from estimated downloads";
  }

  return {
    downloads: downloads === null ? null : Math.round(downloads),
    revenue: revenue === null ? null : Math.round(revenue),
    downloadsBasis,
    revenueBasis,
  };
}

// App Explorer: one chart listing, one storefront. `genreId` is the category
// filter, if any; its charts double as the category signal, since every row
// came from one of them.
export async function withEstimates(apps: ChartApp[], store: Store, country: string, genreId: string | null): Promise<ChartApp[]> {
  if (!supportsEstimates(store, country) || apps.length === 0) return apps;
  const categoryGenre = isChartableGenre(store, genreId) ? genreId : null;
  const [overall, category] = await Promise.all([
    fetchChartSet(store, country, null),
    categoryGenre ? fetchChartSet(store, country, categoryGenre) : Promise.resolve(null),
  ]);
  return apps.map((a) => ({
    ...a,
    estimate: estimate(
      {
        store,
        country,
        ids: [a.storeId, ...(a.bundleId && a.bundleId !== a.storeId ? [a.bundleId] : [])],
        price: a.price,
        genreId: categoryGenre,
        ratingCount: a.ratingCount,
        releasedAt: a.releasedAt,
      },
      overall,
      category,
    ),
  }));
}

// Compare Apps: one app, with its full store listing in hand, so it can be
// placed in its own category's charts and fall back on install/rating counts.
export async function estimateApp(store: Store, storeId: string, bundleId: string, country: string, storeData: StoreData): Promise<AppEstimate | null> {
  if (!supportsEstimates(store, country) || !storeData) return null;
  const genreId = isChartableGenre(store, storeData.primaryGenreId ?? null) ? storeData.primaryGenreId! : null;
  const [overall, category] = await Promise.all([
    fetchChartSet(store, country, null),
    genreId ? fetchChartSet(store, country, genreId) : Promise.resolve(null),
  ]);
  return estimate(
    {
      store,
      country,
      ids: [storeId, bundleId].filter(Boolean),
      price: storeData.price ?? 0,
      genreId,
      ratingCount: storeData.ratingCount,
      installs: storeData.installs,
      releasedAt: storeData.releasedAt,
      offersIAP: storeData.offersIAP,
    },
    overall,
    category,
  );
}
