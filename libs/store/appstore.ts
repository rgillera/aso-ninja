import type { AppSearchResult } from "@/libs/contracts";

export async function searchAppStore(
  q: string,
  country: string
): Promise<AppSearchResult[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&country=${country}&limit=15`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((r: any) => ({
      name: r.trackName,
      store: "ios" as const,
      bundleId: r.bundleId,
      storeId: String(r.trackId),
      iconUrl: r.artworkUrl100?.replace("100x100bb", "200x200bb") ?? "",
      developer: r.sellerName ?? r.artistName ?? "",
    }));
  } catch {
    return [];
  }
}

export async function lookupAppStore(storeId: string): Promise<AppSearchResult | null> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${storeId}`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = data.results?.[0];
    if (!r) return null;
    return {
      name: r.trackName,
      store: "ios",
      bundleId: r.bundleId,
      storeId: String(r.trackId),
      iconUrl: r.artworkUrl100?.replace("100x100bb", "200x200bb") ?? "",
      developer: r.sellerName ?? r.artistName ?? "",
    };
  } catch {
    return null;
  }
}
