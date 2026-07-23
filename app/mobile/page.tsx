import { cookies } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import { MobileMonitor } from "@/features/mobile/MobileMonitor";

// Reuses the same lastAppId/lastWorkspaceId cookies DashboardShell already
// writes (features/dashboard/DashboardShell.tsx) — no separate "which app"
// picker to build for this route.
export default async function MobilePage() {
  const cookieStore = await cookies();
  const appId = cookieStore.get("lastAppId")?.value ?? null;

  if (!appId) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-neutral-500">
        Open the full dashboard on the web and select an app first — this view follows
        whichever app you last viewed there.
      </main>
    );
  }

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("apps")
    .select("id, name, store, icon_url, store_id, country")
    .eq("id", appId)
    .maybeSingle();

  if (!app) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-neutral-500">
        Couldn&apos;t find that app anymore — open the dashboard on the web and pick one again.
      </main>
    );
  }

  return (
    <MobileMonitor
      appId={app.id}
      appName={app.name}
      appIconUrl={app.icon_url}
      store={app.store}
      storeId={app.store_id}
      country={app.country}
    />
  );
}
