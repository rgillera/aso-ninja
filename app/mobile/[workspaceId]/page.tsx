import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { getWorkspaceApps } from "@/libs/mobile-nav";
import { AppPicker } from "@/features/mobile/AppPicker";

export default async function MobileWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ switch?: string }>;
}) {
  const { workspaceId } = await params;
  const { switch: forceSwitch } = await searchParams;

  const supabase = await createClient();
  const apps = await getWorkspaceApps(supabase, workspaceId);

  if (!apps.length) redirect("/mobile");

  // ?switch=1 (from MobileMonitor's "‹ Apps" link) bypasses the
  // remembered-cookie/single-app auto-skip below — see app/mobile/page.tsx
  // for why that bypass exists.
  if (!forceSwitch) {
    const cookieStore = await cookies();
    const lastAppId = cookieStore.get("lastAppId")?.value;
    const remembered = apps.find((a) => a.id === lastAppId);
    if (remembered) redirect(`/mobile/${workspaceId}/${remembered.id}`);
    if (apps.length === 1) redirect(`/mobile/${workspaceId}/${apps[0].id}`);
  }

  return <AppPicker workspaceId={workspaceId} apps={apps} />;
}
