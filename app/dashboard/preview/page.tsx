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

function decodeHtmlEntities(s: string) {
  return s.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
}

async function fetchGooglePlayData(packageId: string, country: string) {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (api as any).app({ appId: packageId, country: country.toLowerCase(), lang: "en" });

    return {
      screenshotUrls: (r.screenshots ?? []).slice(0, 7).map((url: string) => `${url}=w390-h844-rw`),
      subtitle:               decodeHtmlEntities(r.summary ?? ""),
      description:            r.description ?? "",
      releaseNotes:           r.recentChanges ? decodeHtmlEntities(r.recentChanges.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")) : "",
      rating:                 r.score as number | undefined,
      ratingCount:            r.ratings as number | undefined,
      primaryGenreName:       r.genre ?? "",
      contentAdvisoryRating:  r.contentRating ?? "3+",
      version:                r.version ?? "",
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

  if (page === "preview") {
    return <AppPagePreview app={syntheticApp} allApps={allApps} storeData={storeData} />;
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
