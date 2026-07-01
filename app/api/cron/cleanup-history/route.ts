import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Drop rankings older than 90 days
  const { count: deletedRankings, error: e1 } = await supabase
    .from("keyword_rankings_history")
    .delete({ count: "exact" })
    .lt("recorded_on", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  // Null out raw_apps older than 7 days (data already in keyword_rankings_history)
  const { count: nulledBlobs, error: e2 } = await supabase
    .from("keyword_volume_history")
    .update({ raw_apps: null }, { count: "exact" })
    .lt("recorded_on", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .not("raw_apps", "is", null);

  if (e1 || e2) {
    return NextResponse.json({ error: e1?.message ?? e2?.message }, { status: 500 });
  }

  return NextResponse.json({ deletedRankings, nulledBlobs });
}
