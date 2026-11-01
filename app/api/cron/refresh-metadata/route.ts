import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { fetchIosStoreData } from "@/libs/store/appstore";
import { fetchAndroidStoreData } from "@/libs/store/googleplay";
import { recordMetadataSnapshot } from "@/libs/store/metadata-snapshots";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";

// Vercel: 300s on Pro, 60s on Hobby — same cap as refresh-keywords. iOS calls
// are serialized 3.5s apart via enqueueAppleRequest, so 60 listings is what
// fits in one run (200 used to get the run killed partway). The cron runs
// hourly; listings beyond the limit are still "missing today's snapshot" on
// the next run, since stale_metadata_apps always re-evaluates from scratch,
// and once every listing has one a run returns right away. See that
// function's migrations for why the staleness + plan filtering happens in
// SQL rather than after an app-side `.limit()`.
export const maxDuration = 300;
const BATCH_LIMIT = 60;

// A followed app, or one of its competitors (competitor_id set). For an iOS
// competitor bundle_id is "" until the first fetch fills it in.
type ListingRow = {
  id: string;
  workspace_id: string;
  store: "ios" | "android";
  bundle_id: string;
  store_id: string;
  country: string | null;
  competitor_id: string | null;
};

// Timeline (and the history it's built from) is a Pro feature — apps
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
  if (!eligible?.length) return NextResponse.json({ recorded: 0, message: "No Pro apps pending today's snapshot" });

  let recorded = 0;
  let failed = 0;

  for (const listing of eligible as ListingRow[]) {
    try {
      const storeData = listing.store === "ios"
        ? listing.store_id
          ? await enqueueAppleRequest(() => fetchIosStoreData(listing.store_id, listing.country ?? "US", { fresh: true }))
          : null
        : listing.bundle_id
          ? await fetchAndroidStoreData(listing.bundle_id, listing.country ?? "US", { fresh: true })
          : null;

      if (storeData) {
        const bundleId = listing.bundle_id || storeData.bundleId || "";
        if (listing.competitor_id && !listing.bundle_id && bundleId) {
          // Every competitor row for this app, in any workspace.
          await supabase.from("app_competitors").update({ bundle_id: bundleId }).eq("store_id", listing.store_id).is("bundle_id", null);
        }
        await recordMetadataSnapshot(supabase, {
          appId: listing.competitor_id ? null : listing.id,
          store: listing.store,
          storeId: listing.store_id,
          bundleId,
          country: listing.country ?? "US",
        }, storeData);
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
