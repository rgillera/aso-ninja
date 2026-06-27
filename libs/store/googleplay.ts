import type { AppSearchResult } from "@/libs/contracts";

function ensureHttps(url: string): string {
  return url.startsWith("//") ? "https:" + url : url;
}

export async function searchPlayStore(
  q: string,
  country: string
): Promise<AppSearchResult[]> {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await (api as any).search({
      term: q,
      country: country.toLowerCase(),
      num: 15,
    });
    return results.map((r) => ({
      name: r.title,
      store: "android" as const,
      bundleId: r.appId,
      storeId: r.appId,
      iconUrl: r.icon ? ensureHttps(r.icon) + "=s200" : "",
      developer: r.developer ?? "",
    }));
  } catch {
    return [];
  }
}

export async function lookupPlayStore(bundleId: string): Promise<AppSearchResult | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (api as any).app({ appId: bundleId });
    return {
      name: r.title,
      store: "android",
      bundleId: r.appId,
      storeId: r.appId,
      iconUrl: r.icon ? ensureHttps(r.icon) + "=s200" : "",
      developer: r.developer ?? "",
    };
  } catch {
    return null;
  }
}
