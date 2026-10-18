import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { extractIosSubtitle } from "@/libs/store/appstore";

const MAX_APPS = 20;
const CONCURRENCY = 4;
// Subtitles rarely change, and popular keywords share most of their top
// apps, so a few days of caching means most lookups never hit Apple at all.
const CACHE_REVALIDATE_SECONDS = 3 * 24 * 60 * 60;
const IOS_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// The iTunes API has no subtitle field, so it's read from the store page
// (same extraction as fetchIosSubtitle in libs/keyword-relevancy.ts). Throws
// on a failed page load instead of returning "": unstable_cache doesn't cache
// a thrown error, so a transient failure (rate limit, timeout) is retried next
// time rather than cached as "no subtitle" for days. A real "" (the app has no
// subtitle set) does get cached.
async function scrapeIosSubtitle(trackId: number, name: string, country: string): Promise<string> {
  const res = await fetch(`https://apps.apple.com/${country}/app/id${trackId}`, {
    headers: { "User-Agent": IOS_UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`app store page ${res.status}`);
  return extractIosSubtitle(await res.text(), name, String(trackId));
}

const cachedIosSubtitle = unstable_cache(scrapeIosSubtitle, ["ios-subtitle"], { revalidate: CACHE_REVALIDATE_SECONDS });

// POST /api/keywords/subtitles — body: { country, workspaceId, apps: [{ trackId, name }] }
// App Store subtitles for Keyword Inspector's results list, loaded after the
// list itself so it never waits on 20 page fetches. Google Play doesn't need
// this: its search results already carry the short description.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { country: rawCountry, workspaceId, apps: rawApps } = body as {
    country?: string; workspaceId?: string; apps?: { trackId?: number; name?: string }[];
  };
  const country = (rawCountry ?? "us").toLowerCase();
  if (!/^[a-z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country." }, { status: 400 });

  const apps = (Array.isArray(rawApps) ? rawApps : [])
    .filter((a): a is { trackId: number; name: string } => Number.isInteger(a?.trackId) && (a.trackId as number) > 0 && typeof a?.name === "string")
    .slice(0, MAX_APPS);
  if (!apps.length) return NextResponse.json({ subtitles: {} });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) {
    return NextResponse.json({ error: "Keyword Inspector requires the Pro plan or above." }, { status: 403 });
  }

  // A few at a time rather than all 20 at once, to stay gentle on Apple.
  // A failed lookup just leaves that app out; the row keeps showing its developer.
  const subtitles: Record<string, string> = {};
  for (let i = 0; i < apps.length; i += CONCURRENCY) {
    const batch = apps.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((a) => cachedIosSubtitle(a.trackId, a.name, country)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) subtitles[String(batch[j].trackId)] = r.value;
    });
  }

  return NextResponse.json({ subtitles });
}
