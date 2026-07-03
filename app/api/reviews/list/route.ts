import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { syncReviews } from "@/libs/store/reviews-sync";
import type { RatingHistogram } from "@/features/aso/reviews/shared/starColors";

const STARS = ["1", "2", "3", "4", "5"] as const;

type ReviewRow = {
  id: string;
  author: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string | null;
  reviewed_at: string | null;
  version: string | null;
  reply_body: string | null;
};

function emptyHistogram(): RatingHistogram {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
}

function summarize(rows: ReviewRow[]) {
  const histogram = emptyHistogram();
  let sum = 0;
  for (const r of rows) {
    histogram[String(r.rating) as keyof RatingHistogram]++;
    sum += r.rating;
  }
  return { total: rows.length, avgRating: rows.length ? sum / rows.length : null, histogram };
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// GET /api/reviews/list?appId=...&store=ios&country=us&storeId=...&bundleId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId    = searchParams.get("appId") ?? "";
  const store    = (searchParams.get("store") ?? "ios") as "ios" | "android";
  const country  = searchParams.get("country") ?? "US";
  const storeId  = searchParams.get("storeId") ?? "";
  const bundleId = searchParams.get("bundleId") ?? "";
  const from     = searchParams.get("from") ?? "";
  const to       = searchParams.get("to") ?? "";

  if (!appId || !from || !to) {
    return NextResponse.json({ error: "appId, from, and to are required" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    await syncReviews(supabase, appId, store, country, storeId, bundleId);
  } catch {
    // Best-effort — fall through to whatever's already synced.
  }

  const rangeDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (rangeDays - 1));

  const fromTs = `${from}T00:00:00.000Z`;
  const toTs = `${to}T23:59:59.999Z`;
  const prevFromTs = `${prevFrom.toISOString().slice(0, 10)}T00:00:00.000Z`;
  const prevToTs = `${prevTo.toISOString().slice(0, 10)}T23:59:59.999Z`;

  const [currentRes, previousRes] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, author, rating, title, body, reviewed_at, version, reply_body")
      .eq("app_id", appId)
      .gte("reviewed_at", fromTs)
      .lte("reviewed_at", toTs)
      .order("reviewed_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, rating")
      .eq("app_id", appId)
      .gte("reviewed_at", prevFromTs)
      .lte("reviewed_at", prevToTs),
  ]);

  const currentRows = (currentRes.data ?? []) as ReviewRow[];
  const previousRows = (previousRes.data ?? []) as Pick<ReviewRow, "id" | "rating">[];

  const current = summarize(currentRows);
  const previous = summarize(previousRows as ReviewRow[]);

  const stats = {
    avgRating: current.avgRating,
    avgRatingDeltaPct: pctChange(current.avgRating, previous.avgRating),
    totalNew: current.total,
    totalNewDeltaPct: pctChange(current.total, previous.total),
    starDistribution: current.histogram,
  };

  const seriesByDay = new Map<string, { byStar: RatingHistogram; ratingSum: number; count: number }>();
  for (const r of currentRows) {
    if (!r.reviewed_at) continue;
    const key = dayKey(r.reviewed_at);
    let bucket = seriesByDay.get(key);
    if (!bucket) {
      bucket = { byStar: emptyHistogram(), ratingSum: 0, count: 0 };
      seriesByDay.set(key, bucket);
    }
    bucket.byStar[String(r.rating) as keyof RatingHistogram]++;
    bucket.ratingSum += r.rating;
    bucket.count++;
  }
  const series = [...seriesByDay.entries()]
    .map(([date, b]) => ({ date, byStar: b.byStar, avgRating: b.count ? b.ratingSum / b.count : null }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const growth = [
    { label: "Total new reviews", gained: current.total, absoluteGrowth: current.total - previous.total, percentGrowth: pctChange(current.total, previous.total) },
    ...STARS.slice().reverse().map((star) => {
      const currentCount = current.histogram[star];
      const previousCount = previous.histogram[star];
      return {
        label: `${star} star${star === "1" ? "" : "s"}`,
        gained: currentCount,
        absoluteGrowth: currentCount - previousCount,
        percentGrowth: pctChange(currentCount, previousCount),
      };
    }),
  ];

  const reviews = currentRows.map((r) => ({
    id: r.id,
    author: r.author,
    rating: r.rating,
    title: r.title,
    body: r.body,
    reviewedAt: r.reviewed_at,
    version: r.version,
    replyBody: r.reply_body,
  }));

  return NextResponse.json({ stats, series, growth, reviews });
}
