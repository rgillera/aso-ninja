import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import Timeline from "@/features/aso/metadata/timeline";
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

  const { data: allApps } = await supabase
    .from("apps")
    .select("*")
    .eq("workspace_id", app.workspace_id)
    .order("created_at", { ascending: false });

  return (
    <Timeline
      app={app as App}
      allApps={(allApps ?? []) as App[]}
    />
  );
}
