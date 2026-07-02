import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import AppPagePreview from "@/features/aso/metadata/preview/AppPagePreview";
import type { App } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── iOS ─────────────────────────────────────────────────────────────────────

const IOS_EXCLUDE = /Placeholder|AppIcon|Features|\{w\}x\{h\}/i;

async function scrapeIosScreenshots(storeId: string, country: string): Promise<string[]> {
  try {
    const res = await fetch(`https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });
    const html = await res.text();
    const re = /(https:\/\/is\d+-?ssl\.mzstatic\.com\/image\/thumb\/[^"'\s]+\/)(\d{2,4}x\d{3,4}bb(?:-\d+)?\.(?:webp|jpg|png))/g;
    const seen = new Set<string>();
    const results: string[] = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const base = m[1];
      if (IOS_EXCLUDE.test(base)) continue;
      const [w, h] = m[2].split("x").map(Number);
      if (h <= w) continue;
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
    };
  } catch { return null; }
}

// ─── Android ─────────────────────────────────────────────────────────────────

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
      screenshotUrls: (r.screenshots ?? []).slice(0, 7).map((url: string) => `${url}=w390-h844-rw`),
      subtitle: decodeHtmlEntities(r.summary ?? ""),
      description: r.description ?? "",
      releaseNotes: r.recentChanges ? decodeHtmlEntities(r.recentChanges.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")) : "",
      rating: r.score as number | undefined,
      ratingCount: r.ratings as number | undefined,
      primaryGenreName: r.genre ?? "",
      contentAdvisoryRating: r.contentRating ?? "3+",
    };
  } catch { return null; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const packageId = app.bundle_id;
  const country = app.country ?? "US";

  const [{ data: allApps }, storeData] = await Promise.all([
    supabase.from("apps").select("*").eq("workspace_id", app.workspace_id).order("created_at", { ascending: false }),
    app.store === "ios" && app.store_id
      ? fetchItunesData(app.store_id, country)
      : app.store === "android" && packageId
        ? fetchGooglePlayData(packageId, country)
        : Promise.resolve(null),
  ]);

  return (
    <AppPagePreview
      app={app as App}
      allApps={(allApps ?? []) as App[]}
      storeData={storeData}
    />
  );
}
