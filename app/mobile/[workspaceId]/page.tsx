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

  // Was `redirect("/mobile")` — but for a brand-new account (one eligible
  // workspace, zero apps), /mobile's own single-workspace auto-skip would
  // just bounce straight back here, looping forever. Setup itself can only
  // happen on the web (mobile is view-only), so show that instead of
  // silently redirecting nowhere useful.
  if (!apps.length) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-neutral-500">
        <p>No apps in this workspace yet.</p>
        <p className="mt-2">
          Mobile is for viewing your rankings, not managing them — add your first app from the
          web dashboard on your computer.
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-block rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
        >
          Open web dashboard
        </a>
      </main>
    );
  }

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
