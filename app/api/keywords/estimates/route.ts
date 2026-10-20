import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import type { AppEstimate } from "@/libs/contracts";
import { fetchStoreData } from "@/libs/store/load-benchmark";
import { estimateApp, supportsEstimates } from "@/libs/store/appEstimates";

const MAX_APPS = 20;
const CONCURRENCY = 4;

export type KeywordResultEstimates = {
  // false = no model for this storefront (see supportsEstimates), so the
  // columns stay hidden rather than showing a row of blanks.
  supported: boolean;
  // Keyed by store id: App Store track id, or Google Play package name.
  estimates: Record<string, AppEstimate>;
};

// POST /api/keywords/estimates — body: { store, country, ids: string[] }
// Rough monthly downloads and revenue for Keyword Inspector's results list,
// from the same model App Explorer and Compare Apps use
// (libs/store/appEstimates.ts). Loaded after the list, like subtitles, since
// each app needs its full store listing (cached 6h per app) to be placed.
// Open to every signed-in user: it only fills in rows of a lookup the
// inspect route already allowed.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { store: rawStore, country: rawCountry, ids: rawIds } = body as {
    store?: string; country?: string; ids?: unknown[];
  };
  const store = rawStore === "android" ? "android" : "ios";
  const country = (rawCountry ?? "us").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country." }, { status: 400 });

  const ids = (Array.isArray(rawIds) ? rawIds : [])
    .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200)
    .filter((id) => store === "android" || /^\d+$/.test(id))
    .slice(0, MAX_APPS);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!supportsEstimates(store, country)) {
    return NextResponse.json({ supported: false, estimates: {} } satisfies KeywordResultEstimates);
  }

  // A few at a time, to stay gentle on the stores. A failed lookup just
  // leaves that app out; its row shows a dash.
  const estimates: Record<string, AppEstimate> = {};
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(async (id) => {
      const storeId = store === "ios" ? id : "";
      const bundleId = store === "android" ? id : "";
      const storeData = await fetchStoreData(store, storeId, bundleId, country);
      return estimateApp(store, storeId, bundleId, country, storeData);
    }));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) estimates[batch[j]] = r.value;
    });
  }

  return NextResponse.json({ supported: true, estimates } satisfies KeywordResultEstimates);
}
