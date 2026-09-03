import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";

export type VolumeHistoryEntry = {
  month: string;       // "2026-03"
  recorded_on: string; // first of that month, e.g. "2026-03-01" — kept for the panel's existing date formatting
  score: number;       // average of every snapshot recorded that month
};

// Pro+ gets a full year, everyone else gets the same 6-month window Pro sees
// — but Free/Basic get it back `locked: true` so the panel can render the
// real trend blurred behind an upgrade prompt instead of hiding it outright.
// Tiering matches Metadata Timeline (app/api/metadata/timeline).
function windowMonthsForPlan(planSlug: PlanSlug): number {
  return isPlanAtLeast(planSlug, "pro_plus") ? 12 : 6;
}

function monthKey(recordedOn: string): string {
  return recordedOn.slice(0, 7); // "YYYY-MM"
}

// GET /api/keywords/volume-history?term=calorie+counter&store=ios&country=us&workspaceId=...
//
// Every real Volume snapshot we have for this keyword, rolled up into one
// averaged point per calendar month, over the window the caller's plan
// allows. Months with no snapshot at all are filled from the nearest month
// that does have one, so a keyword with a single snapshot still draws as a
// flat line across the whole window instead of a lone dot.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const term        = (searchParams.get("term") ?? "").toLowerCase().trim();
  const store       = searchParams.get("store") ?? "ios";
  const country     = (searchParams.get("country") ?? "us").toLowerCase();
  const workspaceId = searchParams.get("workspaceId") ?? "";

  if (!term) return NextResponse.json({ rows: [] });

  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug: PlanSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const months = windowMonthsForPlan(planSlug);
  const locked = !isPlanAtLeast(planSlug, "pro");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keyword_volume_history")
    .select("recorded_on, score")
    .eq("term", term)
    .eq("store", store)
    .eq("country", country)
    .order("recorded_on", { ascending: true });

  if (error) return NextResponse.json({ rows: [] }, { status: 500 });

  const raw = (data ?? []) as { recorded_on: string; score: number }[];
  if (raw.length === 0) return NextResponse.json({ rows: [], locked });

  // Average every snapshot down to one score per calendar month.
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of raw) {
    const key = monthKey(row.recorded_on);
    const bucket = totals.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += row.score;
    bucket.count += 1;
    totals.set(key, bucket);
  }
  const monthlyAverage = new Map<string, number>();
  for (const [key, { sum, count }] of totals) monthlyAverage.set(key, Math.round(sum / count));

  // The last `months` calendar months, oldest first, ending this month.
  const now = new Date();
  const bucketKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    bucketKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const values: (number | null)[] = bucketKeys.map((key) => monthlyAverage.get(key) ?? null);
  for (let i = 1; i < values.length; i++) {
    if (values[i] == null) values[i] = values[i - 1];
  }
  for (let i = values.length - 2; i >= 0; i--) {
    if (values[i] == null) values[i] = values[i + 1];
  }
  // Every month in the window predates any snapshot we have (e.g. a keyword
  // only ever checked once, months before this window started) — fall back
  // to the overall average rather than leaving the chart empty.
  const overallAverage = Math.round(raw.reduce((sum, r) => sum + r.score, 0) / raw.length);

  const rows: VolumeHistoryEntry[] = bucketKeys.map((key, i) => ({
    month: key,
    recorded_on: `${key}-01`,
    score: values[i] ?? overallAverage,
  }));

  return NextResponse.json({ rows, locked });
}
