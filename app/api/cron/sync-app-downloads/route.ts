import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppDownloads } from "@/libs/store-connections/sync";

// Vercel: 300s on Pro, 60s on Hobby — same budget note as refresh-keywords.
export const maxDuration = 300;

const BATCH_LIMIT = 200;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: due, error } = await supabase
    .from("app_store_connections")
    .select("app_id")
    .eq("status", "connected")
    .or(`last_synced_on.is.null,last_synced_on.lt.${today}`)
    .limit(BATCH_LIMIT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ synced: 0, message: "All connected apps up to date" });

  let synced = 0;
  let failed = 0;

  // Per-item try/catch so one bad connection (expired credential, provider
  // outage) can't starve the rest of the run — same shape as
  // app/api/cron/refresh-keywords/route.ts.
  for (const { app_id } of due) {
    try {
      const result = await syncAppDownloads(app_id, supabase);
      if (result.ok) synced++; else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    synced, failed, total: due.length,
    message: `Synced ${synced}/${due.length} connected apps.`,
  });
}
