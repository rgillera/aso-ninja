import { notFound, redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import AppPagePreview from "@/features/aso/metadata/AppPagePreview";
import type { App, Workspace } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

const EXCLUDE = /Placeholder|AppIcon|Features|{w}x{h}/i;

async function scrapeScreenshots(storeId: string, country: string): Promise<string[]> {
  try {
    const url = `https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      cache: "no-store",
    });
    const html = await res.text();
    console.log(`[scrape] ${url} → status ${res.status}, html size ${html.length}`);

    const re = /(https:\/\/is\d+-?ssl\.mzstatic\.com\/image\/thumb\/[^"'\s]+\/)(\d{2,4}x\d{3,4}bb(?:-\d+)?\.(?:webp|jpg|png))/g;
    const seen = new Set<string>();
    const results: string[] = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const base = m[1];
      if (EXCLUDE.test(base)) continue;
      const [w, h] = m[2].split("x").map(Number);
      if (h <= w) continue;
      if (!seen.has(base)) {
        seen.add(base);
        results.push(`${base}300x650bb.webp`);
      }
      if (results.length >= 6) break;
    }
    console.log(`[scrape] found ${results.length} screenshots for ${storeId}`);
    return results;
  } catch (err) {
    console.error(`[scrape] failed for ${storeId}:`, err);
    return [];
  }
}

async function fetchItunesData(storeId: string, country: string) {
  try {
    const [apiRes, screenshots] = await Promise.all([
      fetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`, {
        next: { revalidate: 3600 },
      }),
      scrapeScreenshots(storeId, country),
    ]);
    const json = await apiRes.json();
    const result = json.results?.[0];
    if (!result) return null;
    return {
      screenshotUrls: screenshots,
      subtitle: (result.subtitle ?? "") as string,
      description: (result.description ?? "") as string,
      releaseNotes: (result.releaseNotes ?? "") as string,
      rating: result.averageUserRating as number | undefined,
      ratingCount: result.userRatingCount as number | undefined,
      primaryGenreName: (result.primaryGenreName ?? "") as string,
      contentAdvisoryRating: (result.contentAdvisoryRating ?? "") as string,
    };
  } catch {
    return null;
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: app, error }, { data: workspaces }] = await Promise.all([
    supabase.from("apps").select("*").eq("id", id).single(),
    supabase.from("workspaces").select("*").order("created_at", { ascending: true }),
  ]);

  if (error || !app) notFound();

  const [{ data: allApps }, storeData] = await Promise.all([
    supabase
      .from("apps")
      .select("*")
      .eq("workspace_id", app.workspace_id)
      .order("created_at", { ascending: false }),
    app.store === "ios" && app.store_id
      ? fetchItunesData(app.store_id, app.country ?? "US")
      : Promise.resolve(null),
  ]);

  return (
    <AppPagePreview
      app={app as App}
      allApps={(allApps ?? []) as App[]}
      workspaces={(workspaces ?? []) as Workspace[]}
      storeData={storeData}
    />
  );
}
