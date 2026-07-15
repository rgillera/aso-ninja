import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { fetchIosStoreData } from "@/libs/store/appstore";
import { fetchAndroidStoreData } from "@/libs/store/googleplay";
import { recordMetadataSnapshot } from "@/libs/store/metadata-snapshots";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";

// Vercel: 300s on Pro, 60s on Hobby — same cap as refresh-keywords. iOS calls
// are serialized one-per-second via enqueueAppleRequest, so keep the batch
// small enough to finish in one run; any apps beyond the limit are still
// "missing today's snapshot" on the next run (same day or tomorrow), since
// stale_metadata_apps always re-evaluates from scratch — see that function's
// migration for why the staleness + plan filtering happens in SQL rather
// than after an app-side `.limit()`.
export const maxDuration = 300;
const BATCH_LIMIT = 200;

type AppRow = {
  id: string;
  workspace_id: string;
  store: "ios" | "android";
  bundle_id: string;
  store_id: string;
  country: string | null;
};

// Timeline (and the history it's built from) is a Pro+ feature — apps
// belonging to workspaces below that plan are never fetched or recorded,
// same gate as the live /api/metadata/timeline route.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: eligible, error: staleError } = await supabase.rpc("stale_metadata_apps", {
    p_today: today,
    p_limit: BATCH_LIMIT,
  });

  if (staleError) return NextResponse.json({ error: staleError.message }, { status: 500 });
  if (!eligible?.length) return NextResponse.json({ recorded: 0, message: "No Pro+ apps pending today's snapshot" });

  let recorded = 0;
  let failed = 0;

  for (const app of eligible as AppRow[]) {
    try {
      const storeData = app.store === "ios"
        ? app.store_id
          ? await enqueueAppleRequest(() => fetchIosStoreData(app.store_id, app.country ?? "US"))
          : null
        : app.bundle_id
          ? await fetchAndroidStoreData(app.bundle_id, app.country ?? "US")
          : null;

      if (storeData) {
        await recordMetadataSnapshot(supabase, app.id, storeData);
        recorded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    recorded,
    failed,
    eligible: eligible.length,
  });
}
