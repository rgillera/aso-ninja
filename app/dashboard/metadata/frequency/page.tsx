import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import type { App, Workspace } from "@/libs/contracts";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default async function Page() {
  const cookieStore = await cookies();
  const lastAppId = cookieStore.get("lastAppId")?.value;

  const supabase = await createClient();
  const { data: workspaces } = await supabase.from("workspaces").select("*").order("created_at", { ascending: true });
  const firstWorkspace = ((workspaces ?? []) as Workspace[])[0];
  const { data: apps } = firstWorkspace
    ? await supabase.from("apps").select("*").eq("workspace_id", firstWorkspace.id).order("created_at", { ascending: false })
    : { data: [] };
  const allApps = (apps ?? []) as App[];

  if (lastAppId && allApps.find(a => a.id === lastAppId)) redirect(`/dashboard/apps/${lastAppId}/frequency`);
  if (allApps.length > 0) redirect(`/dashboard/apps/${allApps[0].id}/frequency`);

  return (
    <main className="h-full flex items-center justify-center">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600">Use the search bar above to find an app.</p>
      </div>
    </main>
  );
}
