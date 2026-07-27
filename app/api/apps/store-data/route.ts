import { NextRequest, NextResponse } from "next/server";

// Client-fetchable subset of what app/dashboard/apps/[id]/preview/page.tsx's
// fetchItunesData/fetchGooglePlayData compute server-side — just subtitle +
// description, needed to seed the Keyword Simulator's "current" values for
// apps that don't (yet) have an `apps` table row, so it works the same for a
// followed app or one still being previewed.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchIosAppPage(storeId: string, country: string): Promise<string | null> {
  try {
    const res = await fetch(`https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });
    return await res.text();
  } catch { return null; }
}

// The public iTunes lookup API has no "subtitle" field at all — the marketing
// subtitle shown under the app name only exists in the store page's embedded
// JSON, tied to the exact title text. Apps without one set just won't match.
// The hero card's field order isn't stable across apps: some put
// isIOSBinaryMacOSCompatible/useAdsLocale between title and subtitle, others
// put subtitle immediately after title — both are tolerated here.
function extractIosSubtitle(html: string, trackName: string): string {
  try {
    const escaped = trackName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`"title":"${escaped}",(?:"(?:isIOSBinaryMacOSCompatible|useAdsLocale)":(?:true|false),)*"subtitle":"((?:[^"\\\\]|\\\\.)*)"`);
    const m = html.match(re);
    return m ? JSON.parse(`"${m[1]}"`) : "";
  } catch { return ""; }
}

async function fetchIosSubtitleAndDescription(storeId: string, country: string): Promise<{ subtitle: string; description: string } | null> {
  try {
    const [apiRes, html] = await Promise.all([
      fetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`, { cache: "no-store" }),
      fetchIosAppPage(storeId, country),
    ]);
    const json = await apiRes.json();
    const r = json.results?.[0];
    if (!r) return null;
    return {
      subtitle: html ? extractIosSubtitle(html, r.trackName ?? "") : "",
      description: (r.description ?? "") as string,
    };
  } catch { return null; }
}

function decodeHtmlEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

async function fetchAndroidSubtitleAndDescription(packageId: string, country: string): Promise<{ subtitle: string; description: string } | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (api as any).app({ appId: packageId, country: country.toLowerCase(), lang: "en" });
    return {
      subtitle: decodeHtmlEntities(r.summary ?? ""),
      description: r.description ?? "",
    };
  } catch { return null; }
}

// GET /api/apps/store-data?store=ios|android&storeId=&bundleId=&country=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store");
  const storeId = searchParams.get("storeId") ?? "";
  const bundleId = searchParams.get("bundleId") ?? "";
  const country = (searchParams.get("country") ?? "US").toUpperCase();

  if (store === "ios" && storeId) {
    const data = await fetchIosSubtitleAndDescription(storeId, country);
    return NextResponse.json(data ?? { subtitle: "", description: "" });
  }
  if (store === "android" && bundleId) {
    const data = await fetchAndroidSubtitleAndDescription(bundleId, country);
    return NextResponse.json(data ?? { subtitle: "", description: "" });
  }
  return NextResponse.json({ subtitle: "", description: "" });
}
