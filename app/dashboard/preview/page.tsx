import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import ReportPage from "@/features/aso/reports/ReportPage";
import AppPagePreview from "@/features/aso/metadata/preview/AppPagePreview";
import Timeline from "@/features/aso/metadata/timeline";
import MetadataBenchmark from "@/features/aso/metadata/benchmark";
import { fetchIosStoreData, fetchIosCategoryPeers } from "@/libs/store/appstore";
import { fetchAndroidStoreData, fetchAndroidCategoryPeers } from "@/libs/store/googleplay";
import { daysSince } from "@/libs/store/benchmark-utils";
import type { App, Workspace, StoreData, CategoryBenchmark } from "@/libs/contracts";

type PageProps = {
  searchParams: Promise<{
    bundleId?: string;
    storeId?: string;
    store?: string;
    name?: string;
    icon?: string;
    developer?: string;
    country?: string;
    page?: string; // "preview" | "timeline" | "benchmark" | "report" | undefined → preview
  }>;
};

async function loadBenchmark(store: string, storeId: string, bundleId: string, country: string, storeData: StoreData): Promise<CategoryBenchmark> {
  if (store === "ios" && storeData?.primaryGenreId) {
    return fetchIosCategoryPeers(storeData.primaryGenreId, country, storeId);
  }
  if (store === "android" && storeData?.primaryGenreId) {
    return fetchAndroidCategoryPeers(storeData.primaryGenreId, storeData.primaryGenreName, country, bundleId);
  }
  return null;
}

export default async function Page({ searchParams }: PageProps) {
  const { bundleId, storeId, store, name, icon, country, page } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!bundleId || !store || !name) redirect("/dashboard");

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  const allWorkspaces = (workspaces ?? []) as Workspace[];
  const firstWorkspace = allWorkspaces[0];

  const { data: appsData } = firstWorkspace
    ? await supabase.from("apps").select("*").eq("workspace_id", firstWorkspace.id).order("created_at", { ascending: false })
    : { data: [] };

  const allApps = (appsData ?? []) as App[];

  // Check if user already tracks this app
  const tracked = allApps.find(a => a.bundle_id === bundleId && a.store === store);
  if (tracked) redirect(`/dashboard/apps/${tracked.id}`);

  const resolvedCountry = country ?? "US";
  const resolvedStoreId = storeId ?? bundleId;

  // Synthetic App — not in DB, no workspace
  const syntheticApp: App = {
    id:           "__preview__",
    workspace_id: firstWorkspace?.id ?? "",
    name:         name,
    store:        store as "ios" | "android",
    bundle_id:    bundleId,
    store_id:     resolvedStoreId,
    icon_url:     icon ? decodeURIComponent(icon) : null,
    country:      resolvedCountry,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  };

  const storeData = store === "ios" && resolvedStoreId
    ? await fetchIosStoreData(resolvedStoreId, resolvedCountry)
    : store === "android" && bundleId
      ? await fetchAndroidStoreData(bundleId, resolvedCountry)
      : null;

  if (page === "preview") {
    return <AppPagePreview app={syntheticApp} allApps={allApps} storeData={storeData} />;
  }
  if (page === "timeline") {
    return <Timeline app={syntheticApp} allApps={allApps} screenshots={storeData?.screenshotUrls ?? []} />;
  }
  if (page === "benchmark") {
    const benchmark = await loadBenchmark(store, resolvedStoreId, bundleId, resolvedCountry, storeData);
    return (
      <MetadataBenchmark
        app={syntheticApp}
        storeData={storeData}
        benchmark={benchmark}
        daysSinceUpdate={daysSince(storeData?.lastUpdatedAt)}
      />
    );
  }
  return <ReportPage app={syntheticApp} allApps={allApps} storeData={storeData} />;
}
