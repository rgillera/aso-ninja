import { NextRequest, NextResponse } from "next/server";

// GET /api/keywords/screenshots?ids=ID1,ID2,ID3&country=us
// Returns { [trackId]: string[] } — screenshot URLs per app.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids     = searchParams.get("ids") ?? "";
  const country = (searchParams.get("country") ?? "us").toLowerCase();

  if (!ids) return NextResponse.json({});

  try {
    const url = `https://itunes.apple.com/lookup?id=${ids}&country=${country}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res  = await fetch(url, { cache: "no-store" } as any);
    if (!res.ok) return NextResponse.json({});
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, string[]> = {};
    for (const a of (data.results ?? []) as any[]) {
      if (!a.trackId) continue;
      const shots: string[] = a.screenshotUrls?.length
        ? a.screenshotUrls
        : (a.ipadScreenshotUrls ?? []);
      result[String(a.trackId)] = shots.slice(0, 3);
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
