import { createClient } from "@/libs/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type EligibleWorkspace = { id: string; name: string };
export type WorkspaceApp = {
  id: string;
  name: string;
  store: string;
  bundle_id: string;
  icon_url: string | null;
  country: string | null;
  keywordCount: number;
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
// Includes each app's tracked-keyword count (app_keywords has no
// workspace_id of its own, hence the second query keyed on the app ids
// already in hand) and bundle_id, needed by groupAppsByBundle below.
export async function getWorkspaceApps(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<WorkspaceApp[]> {
  const { data: apps } = await supabase
    .from("apps")
    .select("id, name, store, bundle_id, icon_url, country")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (!apps?.length) return [];

  const { data: akRows } = await supabase
    .from("app_keywords")
    .select("app_id")
    .in("app_id", apps.map((a) => a.id));

  const counts = new Map<string, number>();
  for (const row of akRows ?? []) counts.set(row.app_id, (counts.get(row.app_id) ?? 0) + 1);

  return apps.map((a) => ({ ...a, keywordCount: counts.get(a.id) ?? 0 }));
}

export type AppGroup<T> = { key: string; primary: T; entries: T[] };

// The same app tracked in several countries gets one `apps` row per
// (workspace, store, bundle_id, country) — mirrors the grouping
// features/dashboard/MyApps.tsx already does on the web (groupApps there),
// so a multi-country app shows once, with its countries as a sub-list,
// rather than once per country.
export function groupAppsByBundle<T extends { store: string; bundle_id: string }>(
  apps: T[]
): AppGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const app of apps) {
    const key = `${app.store}::${app.bundle_id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(app);
  }
  return [...map.entries()].map(([key, entries]) => ({ key, primary: entries[0], entries }));
}
