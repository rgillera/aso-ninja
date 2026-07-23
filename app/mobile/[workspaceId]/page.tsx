import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { AppPicker } from "@/features/mobile/AppPicker";

export default async function MobileWorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const supabase = await createClient();
  // RLS scopes this to the user's own memberships — a workspace they don't
  // belong to (or a stale/mistyped id) simply returns no rows.
  const { data: apps } = await supabase
    .from("apps")
    .select("id, name, store, icon_url, country")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (!apps?.length) redirect("/mobile");

  const cookieStore = await cookies();
  const lastAppId = cookieStore.get("lastAppId")?.value;
  const remembered = apps.find((a) => a.id === lastAppId);
  if (remembered) redirect(`/mobile/${workspaceId}/${remembered.id}`);
  if (apps.length === 1) redirect(`/mobile/${workspaceId}/${apps[0].id}`);

  return <AppPicker workspaceId={workspaceId} apps={apps} />;
}
