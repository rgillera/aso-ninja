import type { AppSearchResult } from "@/libs/contracts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function itunesFetch(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await fetch(url, { next: { revalidate: 60 } } as any);
      if (res.ok) return res;
      if (res.status === 429 || res.status === 503) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      return null; // non-retryable error
    } catch {
      if (attempt < 2) await sleep(400 * (attempt + 1));
    }
  }
  return null;
}

// Returns null when the API is unavailable (so callers can show an error).
// Returns [] when the API works but there are no matching results.
export async function searchAppStore(
  q: string,
  country: string
): Promise<AppSearchResult[] | null> {
  const res = await itunesFetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&country=${country}&limit=15`
  );
  if (!res) return null;
  try {
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
    return null;
  }
}

export async function lookupAppStore(storeId: string): Promise<AppSearchResult | null> {
  const res = await itunesFetch(`https://itunes.apple.com/lookup?id=${storeId}`);
  if (!res) return null;
  try {
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
