import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
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
  // just bounce straight back here, looping forever. The dashboard (web) is
  // now responsive down to phone widths, so setup — adding an app, adding
  // keywords — works fine there from a phone browser too; this just links
  // out to it instead of duplicating that flow in the mobile monitor.
  if (!apps.length) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-neutral-500">
        <p>No apps in this workspace yet.</p>
        <p className="mt-2">
          Add your first app and start tracking keywords from the dashboard.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          Go to Dashboard
        </Link>
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
