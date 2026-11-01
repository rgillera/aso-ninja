import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppIdentities, type IdentityApp } from "@/libs/store/app-identity";

// Re-reads every followed app's name and icon from its store, so a rename
// shows up within a day even if nobody opens the app (rank alert emails and
// the refresh-keywords cron use apps.name too). iOS listings are looked up
// 150 per call, Android one by one, so the batch is sized for Android's
// worst case; anything left over is the oldest-synced on the next run.
export const maxDuration = 300;
const BATCH_LIMIT = 300;
const RESYNC_AFTER_MS = 20 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - RESYNC_AFTER_MS).toISOString();

  const { data: apps, error } = await supabase
    .from("apps")
    .select("store, store_id, bundle_id, country")
    .or(`identity_synced_at.is.null,identity_synced_at.lt.${cutoff}`)
    .order("identity_synced_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_LIMIT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!apps?.length) return NextResponse.json({ checked: 0, changed: 0 });

  const result = await syncAppIdentities(supabase, apps as IdentityApp[]);
  return NextResponse.json(result);
}
