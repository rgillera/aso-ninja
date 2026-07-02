import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import ReportPage from "@/features/aso/reports/ReportPage";
import type { App } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function scrapeIosScreenshots(storeId: string, country: string): Promise<string[]> {
  try {
    const res = await fetch(`https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`, {
      headers: { "User-Agent": UA }, cache: "no-store",
    });
    const html = await res.text();
    const re = /(https:\/\/is\d+-?ssl\.mzstatic\.com\/image\/thumb\/[^"'\s]+\/)(\d{2,4}x\d{3,4}bb(?:-\d+)?\.(?:webp|jpg|png))/g;
    const EXCLUDE = /Placeholder|AppIcon|Features|\{w\}x\{h\}/i;
    const seen = new Set<string>(); const results: string[] = []; let m;
    while ((m = re.exec(html)) !== null) {
      const base = m[1]; if (EXCLUDE.test(base)) continue;
      const [w, h] = m[2].split("x").map(Number); if (h <= w) continue;
      if (!seen.has(base)) { seen.add(base); results.push(`${base}300x650bb.webp`); }
      if (results.length >= 6) break;
    }
    return results;
  } catch { return []; }
}

async function fetchItunesData(storeId: string, country: string) {
  try {
    const [apiRes, screenshots] = await Promise.all([
      fetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`, { cache: "no-store" }),
      scrapeIosScreenshots(storeId, country),
    ]);
    const json = await apiRes.json();
    const r = json.results?.[0];
    if (!r) return null;
    return {
      screenshotUrls: screenshots,
      subtitle: (r.subtitle ?? "") as string,
      description: (r.description ?? "") as string,
      releaseNotes: (r.releaseNotes ?? "") as string,
      rating: r.averageUserRating as number | undefined,
      ratingCount: r.userRatingCount as number | undefined,
      primaryGenreName: (r.primaryGenreName ?? "") as string,
      contentAdvisoryRating: (r.contentAdvisoryRating ?? "") as string,
      version: (r.version ?? "") as string,
    };
  } catch { return null; }
}

async function fetchGooglePlayData(packageId: string, country: string) {
  try {
    const res = await fetch(
      `https://play.google.com/store/apps/details?id=${packageId}&hl=en&gl=${country}`,
      { headers: { "User-Agent": UA }, cache: "no-store" }
    );
    const html = await res.text();
    const shotRe = /jscontroller="RQJprf"[^>]*><img src="(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"/g;
    const screenshots: string[] = []; let m;
    while ((m = shotRe.exec(html)) !== null) {
      screenshots.push(m[1].replace(/=[^=\s"']+$/, "") + "=w390-h844-rw");
      if (screenshots.length >= 7) break;
    }
    const rvMatch = html.match(/"ratingValue":"([^"]+)"/);
    const rcMatch = html.match(/"ratingCount":"([^"]+)"/);
    const decode = (s: string) => s.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
    const shortMatch = html.match(/<meta[^>]+itemprop="description"[^>]+content="([^"]+)"/) ?? html.match(/content="([^"]+)"[^>]+itemprop="description"/);
    const longMatch = html.match(/data-g-id="description">([\s\S]{50,4000}?)<\/div>/);
    const longDescription = longMatch
      ? longMatch[1].replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim()
      : (shortMatch ? decode(shortMatch[1]) : "");
    const genreMatch = html.match(/"genre":"([^"]+)"/);
    const ageMatch = html.match(/Content Rating<\/div><div[^>]*><span[^>]*>([^<]+)<\/span>/);
    return {
      screenshotUrls: screenshots,
      subtitle: shortMatch ? decode(shortMatch[1]) : "",
      description: longDescription,
      releaseNotes: "",
      rating: rvMatch ? parseFloat(rvMatch[1]) : undefined,
      ratingCount: rcMatch ? parseInt(rcMatch[1]) : undefined,
      primaryGenreName: genreMatch?.[1] ?? "",
      contentAdvisoryRating: ageMatch?.[1] ?? "3+",
      version: "",
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

    if (fallbackApp?.id) redirect(`/dashboard/apps/${fallbackApp.id}/report`);
    redirect("/dashboard");
  }

  const country = app.country ?? "US";
  const [{ data: allApps }, storeData, { data: kwRows }, { data: metricsRows }] = await Promise.all([
    supabase.from("apps").select("*").eq("workspace_id", app.workspace_id).order("created_at", { ascending: false }),
    app.store === "ios" && app.store_id
      ? fetchItunesData(app.store_id, country)
      : app.store === "android" && app.bundle_id
        ? fetchGooglePlayData(app.bundle_id, country)
        : Promise.resolve(null),
    supabase.from("app_keywords").select("keywords!inner(term)").eq("app_id", id),
    supabase.from("keyword_metrics").select("keyword_id, volume, diff, chance, keywords!inner(term)").eq("app_id", id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackedKeywords = (kwRows ?? []).map((r: any) => {
    const kw = Array.isArray(r.keywords) ? r.keywords[0] : r.keywords;
    return kw?.term as string | undefined;
  }).filter((t): t is string => !!t);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordMetrics = (metricsRows ?? []).map((r: any) => {
    const kw = Array.isArray(r.keywords) ? r.keywords[0] : r.keywords;
    return { term: kw?.term as string, volume: r.volume as number, diff: r.diff as number, chance: r.chance as number };
  }).filter((r) => !!r.term).sort((a, b) => b.volume - a.volume);

  return (
    <ReportPage
      app={app as App}
      allApps={(allApps ?? []) as App[]}
      storeData={storeData}
      trackedKeywords={trackedKeywords}
      keywordMetrics={keywordMetrics}
    />
  );
}
