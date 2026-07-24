import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/libs/supabase/server";
import { getEligibleWorkspaces, getAllTrackedApps } from "@/libs/mobile-nav";
import { NotificationSettingsList } from "@/features/mobile/NotificationSettingsList";

// One place to see and toggle rank-change alerts across every app the user
// tracks, instead of only for whichever app they happen to be viewing (see
// features/mobile/NotificationSettingsList.tsx).
export default async function MobileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaces = await getEligibleWorkspaces(supabase, user.id);
  const apps = await getAllTrackedApps(supabase, workspaces);

  const appIds = apps.map((a) => a.id);
  const { data: subs } = appIds.length
    ? await supabase.from("push_app_subscriptions").select("app_id").eq("user_id", user.id).in("app_id", appIds)
    : { data: [] as { app_id: string }[] };
  const enabledIds = new Set((subs ?? []).map((s) => s.app_id));

  const rows = apps.map((a) => ({ ...a, enabled: enabledIds.has(a.id) }));

  return (
    <main className="mx-auto max-w-md">
      <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-4">
        <Link href="/mobile" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
          <ChevronLeftIcon className="size-3.5" />
          Back
        </Link>
      </header>

      <div className="px-4 pb-2 pt-4">
        <h1 className="text-sm font-medium text-gray-100">Notification settings</h1>
        <p className="mt-0.5 text-xs text-gray-600">Choose which apps send you rank-change alerts.</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">No tracked apps yet.</p>
      ) : (
        <NotificationSettingsList apps={rows} />
      )}
    </main>
  );
}
