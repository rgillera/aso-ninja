import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client, not the anon key: keyword_rankings_history has no
  // DELETE policy for the public role (only SELECT/INSERT/UPDATE), so an
  // anon-key delete here silently matches and removes 0 rows — this table
  // was never actually being pruned before this used the admin client.
  const supabase = createAdminClient();

  // Drops rankings past each keyword's plan-aware retention window (see
  // supabase/migrations/20260909000002_plan_aware_rankings_retention.sql) —
  // a keyword tracked by several workspaces keeps the longest window any of
  // them is entitled to; untracked keywords age out at the Free plan's
  // window.
  const { data: deletedRankings, error: e1 } = await supabase.rpc("cleanup_expired_rankings");

  // Same plan-aware windows, applied to Volume (see
  // supabase/migrations/20260910000002_plan_aware_volume_retention.sql).
  const { data: deletedVolume, error: e2 } = await supabase.rpc("cleanup_expired_volume");

  // Null out raw_apps older than 7 days (data already in keyword_rankings_history)
  const { count: nulledBlobs, error: e3 } = await supabase
    .from("keyword_volume_history")
    .update({ raw_apps: null }, { count: "exact" })
    .lt("recorded_on", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .not("raw_apps", "is", null);

  if (e1 || e2 || e3) {
    return NextResponse.json({ error: e1?.message ?? e2?.message ?? e3?.message }, { status: 500 });
  }

  return NextResponse.json({ deletedRankings, deletedVolume, nulledBlobs });
}
