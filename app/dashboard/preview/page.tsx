import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import ReportPage from "@/features/aso/reports/ReportPage";
import AppPagePreview from "@/features/aso/metadata/preview/AppPagePreview";
import Timeline from "@/features/aso/metadata/timeline";
import MetadataHistory from "@/features/aso/metadata/MetadataHistory";
import UpdateFrequency from "@/features/aso/metadata/UpdateFrequency";
import type { App, Workspace } from "@/libs/contracts";

type PageProps = {
  searchParams: Promise<{
    bundleId?: string;
    storeId?: string;
    store?: string;
    name?: string;
    icon?: string;
    developer?: string;
    country?: string;
    page?: string; // "preview" | "timeline" | "history" | "frequency" | "report" | undefined → preview
  }>;
};

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
      subtitle:               (r.subtitle ?? "") as string,
      description:            (r.description ?? "") as string,
      releaseNotes:           (r.releaseNotes ?? "") as string,
      rating:                 r.averageUserRating as number | undefined,
      ratingCount:            r.userRatingCount as number | undefined,
      primaryGenreName:       (r.primaryGenreName ?? "") as string,
      contentAdvisoryRating:  (r.contentAdvisoryRating ?? "") as string,
      version:                (r.version ?? "") as string,
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
      subtitle:               shortMatch ? decode(shortMatch[1]) : "",
      description:            longDescription,
      releaseNotes:           "",
      rating:                 rvMatch ? parseFloat(rvMatch[1]) : undefined,
      ratingCount:            rcMatch ? parseInt(rcMatch[1]) : undefined,
      primaryGenreName:       genreMatch?.[1] ?? "",
      contentAdvisoryRating:  ageMatch?.[1] ?? "3+",
      version:                "",
    };
  } catch { return null; }
}

export default async function Page({ searchParams }: PageProps) {
  const { bundleId, storeId, store, name, icon, country, page } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!bundleId || !store || !name) redirect("/dashboard");

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  const allWorkspaces = (workspaces ?? []) as Workspace[];
  const firstWorkspace = allWorkspaces[0];

  const { data: appsData } = firstWorkspace
    ? await supabase.from("apps").select("*").eq("workspace_id", firstWorkspace.id).order("created_at", { ascending: false })
    : { data: [] };

  const allApps = (appsData ?? []) as App[];

  // Check if user already tracks this app
  const tracked = allApps.find(a => a.bundle_id === bundleId && a.store === store);
  if (tracked) redirect(`/dashboard/apps/${tracked.id}`);

  const resolvedCountry = country ?? "US";
  const resolvedStoreId = storeId ?? bundleId;

  // Synthetic App — not in DB, no workspace
  const syntheticApp: App = {
    id:           "__preview__",
    workspace_id: firstWorkspace?.id ?? "",
    name:         name,
    store:        store as "ios" | "android",
    bundle_id:    bundleId,
    store_id:     resolvedStoreId,
    icon_url:     icon ? decodeURIComponent(icon) : null,
    country:      resolvedCountry,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  };

  const storeData = store === "ios" && resolvedStoreId
    ? await fetchItunesData(resolvedStoreId, resolvedCountry)
    : store === "android" && bundleId
      ? await fetchGooglePlayData(bundleId, resolvedCountry)
      : null;

  if (page === "report") {
    return <ReportPage app={syntheticApp} allApps={allApps} storeData={storeData} />;
  }
  if (page === "timeline") {
    return <Timeline app={syntheticApp} allApps={allApps} screenshots={storeData?.screenshotUrls ?? []} />;
  }
  if (page === "history") {
    return <MetadataHistory app={syntheticApp} allApps={allApps} />;
  }
  if (page === "frequency") {
    return <UpdateFrequency app={syntheticApp} allApps={allApps} />;
  }
  return <ReportPage app={syntheticApp} allApps={allApps} storeData={storeData} />;
}
