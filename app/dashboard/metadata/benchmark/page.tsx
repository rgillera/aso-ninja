import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import type { App, Workspace } from "@/libs/contracts";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type PageProps = { searchParams: Promise<{ ws?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { ws } = await searchParams;
  const cookieStore = await cookies();
  const lastAppId = cookieStore.get("lastAppId")?.value;

  const supabase = await createClient();
  const { data: workspaces } = await supabase.from("workspaces").select("*").order("created_at", { ascending: true });
  const allWorkspaces = (workspaces ?? []) as Workspace[];
  // Prefers the workspace the sidebar was actually showing (?ws=, passed by
  // metaHref()) over the first-created one — otherwise a non-default
  // workspace with no tracked app yet always bounces to workspace #1's apps.
  const activeWorkspace = allWorkspaces.find(w => w.id === ws) ?? allWorkspaces[0];
  const { data: apps } = activeWorkspace
    ? await supabase.from("apps").select("*").eq("workspace_id", activeWorkspace.id).order("created_at", { ascending: false })
    : { data: [] };
  const allApps = (apps ?? []) as App[];

  if (lastAppId && allApps.find(a => a.id === lastAppId)) redirect(`/dashboard/apps/${lastAppId}/benchmark`);
  if (allApps.length > 0) redirect(`/dashboard/apps/${allApps[0].id}/benchmark`);

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
