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

async function fetchGooglePlayData(packageId: string, country: string) {
  try {
    const res = await fetch(
      `https://play.google.com/store/apps/details?id=${packageId}&hl=en&gl=${country}`,
      { headers: { "User-Agent": UA }, cache: "no-store" }
    );
    const html = await res.text();

    // Screenshots: strip any existing size suffix then apply portrait size
    const shotRe = /jscontroller="RQJprf"[^>]*><img src="(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"/g;
    const screenshots: string[] = [];
    let m;
    while ((m = shotRe.exec(html)) !== null) {
      const base = m[1].replace(/=[^=\s"']+$/, ""); // strip existing suffix
      screenshots.push(`${base}=w390-h844-rw`);
      if (screenshots.length >= 7) break;
    }

    // Rating
    const rvMatch = html.match(/"ratingValue":"([^"]+)"/);
    const rcMatch = html.match(/"ratingCount":"([^"]+)"/);
    const rating = rvMatch ? parseFloat(rvMatch[1]) : undefined;
    const ratingCount = rcMatch ? parseInt(rcMatch[1]) : undefined;

    function decodeHtml(s: string) {
      return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    }

    // Short description — meta itemprop
    const shortMatch = html.match(/<meta[^>]+itemprop="description"[^>]+content="([^"]+)"/)
      ?? html.match(/content="([^"]+)"[^>]+itemprop="description"/);
    const shortDescription = shortMatch ? decodeHtml(shortMatch[1]) : "";

    // Long description — data-g-id="description" div
    const longMatch = html.match(/data-g-id="description">([\s\S]{50,4000}?)<\/div>/);
    const longDescription = longMatch
      ? longMatch[1]
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .trim()
      : shortDescription;

    // Genre
    const genreMatch = html.match(/"genre":"([^"]+)"/) ?? html.match(/itemprop="genre"[^>]*>([^<]+)</);
    const genre = genreMatch?.[1] ?? "";

    // Content rating
    const ageMatch = html.match(/Content Rating<\/div><div[^>]*><span[^>]*>([^<]+)<\/span>/);
    const contentRating = ageMatch?.[1] ?? "3+";

    return {
      screenshotUrls: screenshots,
      subtitle: shortDescription,
      description: longDescription,
      releaseNotes: "",
      rating,
      ratingCount,
      primaryGenreName: genre,
      contentAdvisoryRating: contentRating,
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
