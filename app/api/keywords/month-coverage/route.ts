import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Smaller than performance-report's 250: every row here is one term's
// reading this month, and a term can carry several (the refresh cron plus
// Export Report's catch-up pass), so this keeps each batch comfortably under
// PostgREST's 1000-row max_rows cap (supabase/config.toml) even late in a
// month.
const QUERY_BATCH_SIZE = 100;

export type MonthCoverage = {
  month: string;   // "YYYY-MM", UTC, same month key the Export Report uses
  covered: number; // tracked terms with a volume reading this month
  total: number;
};

// POST /api/keywords/month-coverage — body: { terms: string[], store, country }
//
// How many of an app's tracked keywords already have this month's volume
// reading, for the progress line next to Keyword Performance's Export
// button. Uses the same "has a non-null volume score this month" test as
// performance-report's `catchingUp` list, so the line and the post-export
// notice always agree. POST for the same reason as performance-report:
// tracked-keyword count is uncapped on paid plans.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as
    { terms?: string[]; store?: string; country?: string } | null;
  const store   = body?.store ?? "ios";
  const country = (body?.country ?? "us").toLowerCase();
  const terms = [...new Set((body?.terms ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];

  const month = new Date().toISOString().slice(0, 7);
  if (!terms.length) return NextResponse.json({ month, covered: 0, total: 0 } satisfies MonthCoverage);

  const supabase = await createClient();
  const batches: string[][] = [];
  for (let i = 0; i < terms.length; i += QUERY_BATCH_SIZE) batches.push(terms.slice(i, i + QUERY_BATCH_SIZE));

  const results = await Promise.all(
    batches.map((batch) =>
      supabase
        .from("keyword_volume_history")
        .select("term")
        .in("term", batch)
        .eq("store", store)
        .eq("country", country)
        .gte("recorded_on", `${month}-01`)
        .not("score", "is", null)
    )
  );
  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: "Couldn't load coverage" }, { status: 500 });
  }

  const covered = new Set(results.flatMap((r) => r.data ?? []).map((r) => r.term)).size;
  return NextResponse.json({ month, covered, total: terms.length } satisfies MonthCoverage);
}
