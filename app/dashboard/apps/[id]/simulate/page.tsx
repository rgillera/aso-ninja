import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import KeywordSimulator from "@/features/aso/keywords/simulator";
import type { App } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

// Only the subtitle/description prefill is needed here (not screenshots or
// promo text), but these are otherwise the exact same live-fetch functions
// app/dashboard/apps/[id]/preview/page.tsx uses, so the simulator's "Current
// App Subtitle" starting point always matches what Preview shows.

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
function extractIosSubtitle(html: string, trackName: string): string {
  try {
    const escaped = trackName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`"title":"${escaped}","isIOSBinaryMacOSCompatible":(?:true|false),"useAdsLocale":(?:true|false),"subtitle":"((?:[^"\\\\]|\\\\.)*)"`);
    const m = html.match(re);
    return m ? JSON.parse(`"${m[1]}"`) : "";
  } catch { return ""; }
}

async function fetchItunesData(storeId: string, country: string) {
  try {
    const [apiRes, html] = await Promise.all([
      fetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`, { cache: "no-store" }),
      fetchIosAppPage(storeId, country),
    ]);
    const json = await apiRes.json();
    const r = json.results?.[0];
    if (!r) return null;
    return {
      screenshotUrls: [] as string[],
      subtitle: html ? extractIosSubtitle(html, r.trackName ?? "") : "",
      description: (r.description ?? "") as string,
      releaseNotes: "",
      rating: r.averageUserRating as number | undefined,
      ratingCount: r.userRatingCount as number | undefined,
      primaryGenreName: (r.primaryGenreName ?? "") as string,
      contentAdvisoryRating: (r.contentAdvisoryRating ?? "") as string,
    };
  } catch { return null; }
}

function decodeHtmlEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

async function fetchGooglePlayData(packageId: string, country: string) {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (api as any).app({ appId: packageId, country: country.toLowerCase(), lang: "en" });

    return {
      screenshotUrls: [] as string[],
      subtitle: decodeHtmlEntities(r.summary ?? ""),
      description: r.description ?? "",
      releaseNotes: "",
      rating: r.score as number | undefined,
      ratingCount: r.ratings as number | undefined,
      primaryGenreName: r.genre ?? "",
      contentAdvisoryRating: r.contentRating ?? "3+",
    };
  } catch { return null; }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: app, error } = await supabase.from("apps").select("*").eq("id", id).single();

  if (error || !app) {
    const { data: fallbackApp } = await supabase
      .from("apps")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackApp?.id) redirect(`/dashboard/apps/${fallbackApp.id}/simulate`);
    redirect("/dashboard");
  }

  const packageId = app.bundle_id;
  const country = app.country ?? "US";

  const storeData = app.store === "ios" && app.store_id
    ? await fetchItunesData(app.store_id, country)
    : app.store === "android" && packageId
      ? await fetchGooglePlayData(packageId, country)
      : null;

  return <KeywordSimulator app={app as App} storeData={storeData} />;
}
