import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import MetadataBenchmark from "@/features/aso/metadata/benchmark";
import { fetchIosStoreData, fetchIosCategoryPeers } from "@/libs/store/appstore";
import { fetchAndroidStoreData, fetchAndroidCategoryPeers } from "@/libs/store/googleplay";
import { daysSince } from "@/libs/store/benchmark-utils";
import type { App, StoreData, CategoryBenchmark } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

type BenchmarkData = { storeData: StoreData; benchmark: CategoryBenchmark; daysSinceUpdate?: number };

function withDaysSinceUpdate(storeData: StoreData, benchmark: CategoryBenchmark): BenchmarkData {
  return { storeData, benchmark, daysSinceUpdate: daysSince(storeData?.lastUpdatedAt) };
}

async function loadBenchmarkData(app: App): Promise<BenchmarkData> {
  const country = app.country ?? "US";

  if (app.store === "ios" && app.store_id) {
    const storeData = await fetchIosStoreData(app.store_id, country);
    if (!storeData?.primaryGenreId) return withDaysSinceUpdate(storeData, null);
    const benchmark = await fetchIosCategoryPeers(storeData.primaryGenreId, country, app.store_id);
    return withDaysSinceUpdate(storeData, benchmark);
  }

  if (app.store === "android" && app.bundle_id) {
    const storeData = await fetchAndroidStoreData(app.bundle_id, country);
    if (!storeData?.primaryGenreId) return withDaysSinceUpdate(storeData, null);
    const benchmark = await fetchAndroidCategoryPeers(storeData.primaryGenreId, storeData.primaryGenreName, country, app.bundle_id);
    return withDaysSinceUpdate(storeData, benchmark);
  }

  return withDaysSinceUpdate(null, null);
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: app, error } = await supabase.from("apps").select("*").eq("id", id).single();
  if (error || !app) {
    const { data: fallbackApp } = await supabase
      .from("apps")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackApp?.id) redirect(`/dashboard/apps/${fallbackApp.id}/report`);
    redirect("/dashboard");
  }

  const { storeData, benchmark, daysSinceUpdate } = await loadBenchmarkData(app as App);

  return <MetadataBenchmark app={app as App} storeData={storeData} benchmark={benchmark} daysSinceUpdate={daysSinceUpdate} />;
}
