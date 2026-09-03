import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";

export type DailyRankEntry = {
  recorded_on: string;   // "2026-09-03"
  position: number | null; // null = before this keyword's first-ever snapshot, i.e. not tracked yet
};

export type WeeklyRankEntry = {
  week: string;        // Monday of that week, "2026-08-31"
  recorded_on: string; // same as `week` — kept for the panel's date formatting
  position: number | null; // median of every snapshot recorded that week; null = not tracked yet
};

const WEEKS = 13; // ~3 months, matches the 90-day retention in app/api/cron/cleanup-history

// Local calendar date, not toISOString() — avoids shifting a day at UTC
// midnight boundaries when the server's local time isn't UTC.
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday of the calendar week containing this date.
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const diffToMonday = (d.getDay() + 6) % 7; // Sun=0 → 6 days since Monday
  d.setDate(d.getDate() - diffToMonday);
  return dateKey(d);
}

// Free/Basic only see today's rank; Pro and Pro+ see the last 7 days — same
// for both, ranking no longer splits Pro vs Pro+ the way Volume History
// does. The 3-month weekly chart is locked for Free/Basic, open for Pro+.
function daysForPlan(planSlug: PlanSlug): number {
  return isPlanAtLeast(planSlug, "pro") ? 7 : 1;
}

// Carries a real value forward through later gaps (we still believe the
// rank held roughly steady on a day/week we didn't re-check) but never
// backward — a bucket before this keyword's first-ever snapshot has no
// data to estimate from, so it stays null rather than pretending a trend
// existed before we started tracking it.
function fillForward(values: (number | null)[]): (number | null)[] {
  const filled = [...values];
  for (let i = 1; i < filled.length; i++) {
    if (filled[i] == null && filled[i - 1] != null) filled[i] = filled[i - 1];
  }
  return filled;
}

// Median, not mean — rank position is skewed easily by one bad day (a
// scrape hiccup, a brief drop out of the results), which would drag a mean
// off of where the app actually sat most of the week. Median shrugs that
// off and reports the steady rank instead.
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

// GET /api/keywords/rankings-history?keyword=calorie+counter&store=ios&country=us&storeId=...&workspaceId=...
//
// Two views of this app's real rank snapshots for this keyword: a daily bar
// per recent day (today only on Free/Basic, the last 7 days on Pro+), and a
// weekly bar (median position that week) over the last 3 months (locked on
// Free/Basic).
// A gap after tracking started is carried forward from the last known value;
// a bucket before this keyword's first-ever snapshot comes back `null` —
// there's nothing to estimate from before we started checking it — and
// `firstRecordedOn` tells the panel where real history begins, so it can
// say so instead of drawing a bar that isn't real.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword     = (searchParams.get("keyword") ?? "").toLowerCase().trim();
  const store       = searchParams.get("store") ?? "ios";
  const country     = (searchParams.get("country") ?? "us").toLowerCase();
  const storeId     = searchParams.get("storeId") ?? "";
  const workspaceId = searchParams.get("workspaceId") ?? "";

  if (!keyword || !storeId) return NextResponse.json({ daily: [], weekly: [], locked: false, firstRecordedOn: null });

  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug: PlanSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const days = daysForPlan(planSlug);
  const locked = !isPlanAtLeast(planSlug, "pro");

  const supabase = await createClient();
  const since = dateKey(new Date(Date.now() - (WEEKS * 7 + 7) * 86_400_000));
  const { data, error } = await supabase
    .from("keyword_rankings_history")
    .select("recorded_on, position")
    .eq("keyword", keyword)
    .eq("store", store)
    .eq("country", country)
    .eq("app_id", storeId)
    // Null position is a "checked, not found" marker, not a rank.
    .not("position", "is", null)
    .gte("recorded_on", since)
    .order("recorded_on", { ascending: true });

  if (error) return NextResponse.json({ daily: [], weekly: [], locked, firstRecordedOn: null }, { status: 500 });

  const raw = (data ?? []) as { recorded_on: string; position: number }[];
  if (raw.length === 0) return NextResponse.json({ daily: [], weekly: [], locked, firstRecordedOn: null });

  const firstRecordedOn = raw[0].recorded_on; // ascending order
  const today = dateKey(new Date());

  // Daily bars — last `days` calendar days ending today.
  const byDay = new Map(raw.map((r) => [r.recorded_on, r.position]));
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    dayKeys.push(dateKey(d));
  }
  const dailyValues = fillForward(dayKeys.map((k) => byDay.get(k) ?? null));
  const daily: DailyRankEntry[] = dayKeys.map((k, i) => ({ recorded_on: k, position: dailyValues[i] }));

  // Weekly bars — median position per calendar week over the last 3 months.
  const weekPositions = new Map<string, number[]>();
  for (const row of raw) {
    const key = weekStart(row.recorded_on);
    const positions = weekPositions.get(key) ?? [];
    positions.push(row.position);
    weekPositions.set(key, positions);
  }
  const weekMedian = new Map<string, number>();
  for (const [key, positions] of weekPositions) weekMedian.set(key, median(positions));

  const currentWeekStart = weekStart(today);
  const weekKeys: string[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const d = new Date(currentWeekStart + "T00:00:00");
    d.setDate(d.getDate() - i * 7);
    weekKeys.push(dateKey(d));
  }
  const weeklyValues = fillForward(weekKeys.map((k) => weekMedian.get(k) ?? null));
  const weekly: WeeklyRankEntry[] = weekKeys.map((k, i) => ({ week: k, recorded_on: k, position: weeklyValues[i] }));

  return NextResponse.json({ daily, weekly, locked, firstRecordedOn });
}
