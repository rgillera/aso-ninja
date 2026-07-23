import { createClient } from "@/libs/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type EligibleWorkspace = { id: string; name: string };
export type WorkspaceApp = {
  id: string;
  name: string;
  store: string;
  icon_url: string | null;
  country: string | null;
};

// Workspaces where the user has aso_intelligence access — same gate as
// ASO_INTELLIGENCE_PREFIXES in features/dashboard/DashboardShell.tsx. Shared
// by app/mobile/page.tsx, app/api/mobile/nav/route.ts (the navigation
// drawer), and anything else that needs "which workspaces can this user see
// mobile rankings for" so the list can't drift between them.
export async function getEligibleWorkspaces(
  supabase: SupabaseServerClient,
  userId: string
): Promise<EligibleWorkspace[]> {
  const [{ data: workspaces }, { data: memberships }] = await Promise.all([
    supabase.from("workspaces").select("id, name"),
    supabase.from("workspace_members").select("workspace_id, access").eq("user_id", userId),
  ]);

  const accessibleIds = new Set(
    (memberships ?? [])
      .filter((m) => (m.access ?? []).includes("aso_intelligence"))
      .map((m) => m.workspace_id)
  );
  return (workspaces ?? []).filter((w) => accessibleIds.has(w.id));
}

// Apps in a workspace — RLS already scopes this to the user's own
// memberships, so a workspace the caller doesn't belong to just yields [].
export async function getWorkspaceApps(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<WorkspaceApp[]> {
  const { data: apps } = await supabase
    .from("apps")
    .select("id, name, store, icon_url, country")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  return apps ?? [];
}
