import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import MetadataBenchmark from "@/features/aso/metadata/benchmark";
import { fetchStoreData, loadCategoryBenchmark } from "@/libs/store/load-benchmark";
import { daysSince } from "@/libs/store/benchmark-utils";
import type { App, StoreData, CategoryBenchmark } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

type BenchmarkData = { storeData: StoreData; benchmark: CategoryBenchmark; daysSinceUpdate?: number };

async function loadBenchmarkData(app: App): Promise<BenchmarkData> {
  const country = app.country ?? "US";
  const storeData = await fetchStoreData(app.store, app.store_id, app.bundle_id, country);
  const benchmark = await loadCategoryBenchmark(app.store, app.store_id, app.bundle_id, country, storeData);
  return { storeData, benchmark, daysSinceUpdate: daysSince(storeData?.lastUpdatedAt) };
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
