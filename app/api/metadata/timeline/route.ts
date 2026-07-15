import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { fetchIosStoreData } from "@/libs/store/appstore";
import { fetchAndroidStoreData } from "@/libs/store/googleplay";
import { recordMetadataSnapshot, fetchMetadataSnapshots, type MetadataSnapshotRow } from "@/libs/store/metadata-snapshots";
import type { UpdateEvent, FieldUpdate, ScreenshotItem } from "@/features/aso/metadata/timeline/types";

function textField(field: string, before: string | null, after: string | null): FieldUpdate | null {
  if (before == null || after == null || before === after) return null;
  return { field, before, after };
}

function screenshotsField(before: string[] | null, after: string[] | null): FieldUpdate | null {
  if (!before || !after) return null;
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const unchanged = before.length === after.length && before.every((url, i) => url === after[i]);
  if (unchanged) return null;

  const screenshotsBefore: ScreenshotItem[] = before.map(url => ({
    status: afterSet.has(url) ? "repositioned" : "removed",
    url,
  }));
  const screenshotsAfter: ScreenshotItem[] = after.map(url => ({
    status: beforeSet.has(url) ? "repositioned" : "added",
    url,
  }));

  return {
    field: "Screenshots",
    before: `${before.length} screenshot${before.length !== 1 ? "s" : ""}`,
    after: `${after.length} screenshot${after.length !== 1 ? "s" : ""}`,
    screenshotsBefore,
    screenshotsAfter,
  };
}

function diffSnapshots(prev: MetadataSnapshotRow, curr: MetadataSnapshotRow): UpdateEvent | null {
  const fields: FieldUpdate[] = [];

  const title = textField("Title", prev.title, curr.title);
  if (title) fields.push(title);

  const subtitle = textField("Subtitle", prev.subtitle, curr.subtitle);
  if (subtitle) fields.push(subtitle);

  const description = textField("Description", prev.description, curr.description);
  if (description) fields.push(description);

  const category = textField("Category", prev.category, curr.category);
  if (category) fields.push(category);

  const ageRating = textField("Age Rating", prev.age_rating, curr.age_rating);
  if (ageRating) fields.push(ageRating);

  if (prev.language_count != null && curr.language_count != null && prev.language_count !== curr.language_count) {
    fields.push({ field: "Localizations", before: String(prev.language_count), after: String(curr.language_count) });
  }

  if (prev.has_preview_video != null && curr.has_preview_video != null && prev.has_preview_video !== curr.has_preview_video) {
    fields.push({ field: "Preview Video", before: prev.has_preview_video ? "Yes" : "No", after: curr.has_preview_video ? "Yes" : "No" });
  }

  const screenshots = screenshotsField(prev.screenshot_urls, curr.screenshot_urls);
  if (screenshots) fields.push(screenshots);

  if (fields.length === 0) return null;

  return {
    date: curr.recorded_on,
    versionBefore: prev.version ?? "",
    versionAfter: curr.version ?? "",
    fields,
  };
}

// GET /api/metadata/timeline?appId=...&store=ios&country=us&storeId=...&bundleId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId    = searchParams.get("appId") ?? "";
  const store    = (searchParams.get("store") ?? "ios") as "ios" | "android";
  const country  = searchParams.get("country") ?? "US";
  const storeId  = searchParams.get("storeId") ?? "";
  const bundleId = searchParams.get("bundleId") ?? "";
  const from     = searchParams.get("from") ?? "";
  const to       = searchParams.get("to") ?? "";

  if (!appId) return NextResponse.json({ error: "appId is required" }, { status: 400 });

  const storeData = store === "ios" && storeId
    ? await fetchIosStoreData(storeId, country)
    : store === "android" && bundleId
      ? await fetchAndroidStoreData(bundleId, country)
      : null;

  const supabase = await createClient();

  if (storeData) {
    try {
      await recordMetadataSnapshot(supabase, appId, storeData);
    } catch {
      // Best-effort — history accretes over repeat visits, a failed write here
      // shouldn't block the rest of the dashboard from loading.
    }
  }

  const snapshots = from && to ? await fetchMetadataSnapshots(supabase, appId, from, to) : [];

  const events: UpdateEvent[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const event = diffSnapshots(snapshots[i - 1], snapshots[i]);
    if (event) events.push(event);
  }

  return NextResponse.json({ events });
}
