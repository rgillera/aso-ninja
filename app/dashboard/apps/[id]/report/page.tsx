import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import ReportPage from "@/features/aso/reports/ReportPage";
import { fetchIosStoreData } from "@/libs/store/appstore";
import { fetchAndroidStoreData } from "@/libs/store/googleplay";
import type { App } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

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

  const country = app.country ?? "US";
  const [{ data: allApps }, storeData, { data: metricsRows }] = await Promise.all([
    supabase.from("apps").select("*").eq("workspace_id", app.workspace_id).order("created_at", { ascending: false }),
    app.store === "ios" && app.store_id
      ? fetchIosStoreData(app.store_id, country)
      : app.store === "android" && app.bundle_id
        ? fetchAndroidStoreData(app.bundle_id, country)
        : Promise.resolve(null),
    supabase.from("keyword_metrics").select("keyword_id, volume, diff, chance, keywords!inner(term)").eq("app_id", id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordMetrics = (metricsRows ?? []).map((r: any) => {
    const kw = Array.isArray(r.keywords) ? r.keywords[0] : r.keywords;
    return { term: kw?.term as string, volume: r.volume as number, diff: r.diff as number, chance: r.chance as number };
  }).filter((r) => !!r.term).sort((a, b) => b.volume - a.volume);

  return (
    <ReportPage
      app={app as App}
      allApps={(allApps ?? []) as App[]}
      storeData={storeData}
      keywordMetrics={keywordMetrics}
    />
  );
}
