import { NextRequest, NextResponse } from "next/server";
import type { AppSearchResult } from "@/libs/contracts";
import { searchAppStore, lookupAppStore } from "@/libs/store/appstore";
import { searchPlayStore, lookupPlayStore } from "@/libs/store/googleplay";

function parseStoreUrl(input: string): { store: "ios" | "android"; id: string } | null {
  const apple = input.match(/apps\.apple\.com\/.+?\/app\/.+?\/id(\d+)/);
  if (apple) return { store: "ios", id: apple[1] };

  const google = input.match(/play\.google\.com\/store\/apps\/details\?id=([^&\s]+)/);
  if (google) return { store: "android", id: google[1] };

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const store = searchParams.get("store") ?? "all";
  const country = (searchParams.get("country") ?? "US").toUpperCase();

  if (!q) return NextResponse.json({ results: [] });

  // URL paste — direct lookup
  const parsed = parseStoreUrl(q);
  if (parsed) {
    const result =
      parsed.store === "ios"
        ? await lookupAppStore(parsed.id)
        : await lookupPlayStore(parsed.id);
    return NextResponse.json({ results: result ? [result] : [] });
  }

  // Text search
  const [iosRaw, androidResults] = await Promise.all([
    store === "all" || store === "ios" ? searchAppStore(q, country) : [],
    store === "all" || store === "android" ? searchPlayStore(q, country) : [],
  ]);
  const iosResults = iosRaw ?? [];

  // Interleave so neither store dominates
  const results: AppSearchResult[] = [];
  const max = Math.max(iosResults.length, androidResults.length);
  for (let i = 0; i < max; i++) {
    if (iosResults[i]) results.push(iosResults[i]);
    if (androidResults[i]) results.push(androidResults[i]);
  }

  return NextResponse.json({ results });
}
