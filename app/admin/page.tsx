import { createAdminClient } from "@/libs/supabase/admin";
import AdminUsersPage from "@/features/admin/AdminUsersPage";
import type { AdminUserRow } from "@/features/admin/types";

type AuthUserSummary = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
};

// auth.admin.listUsers() is paginated — walk every page rather than
// assuming the user base fits in one response.
async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>): Promise<AuthUserSummary[]> {
  const perPage = 1000;
  const all: AuthUserSummary[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const u of data.users) {
      all.push({
        id: u.id,
        email: u.email ?? "(no email)",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return all;
}

export default async function Page() {
  const admin = createAdminClient();

  const [authUsers, { data: owners, error: ownersErr }] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from("workspace_members").select("user_id, workspace_id").eq("role", "owner"),
  ]);
  if (ownersErr) throw ownersErr;

  // Apps/keywords are workspace-scoped; roll them up per user via the
  // workspace(s) they own (mirrors get_workspace_usage's ownership model).
  const ownedWorkspacesByUser = new Map<string, string[]>();
  for (const row of owners ?? []) {
    const list = ownedWorkspacesByUser.get(row.user_id) ?? [];
    list.push(row.workspace_id);
    ownedWorkspacesByUser.set(row.user_id, list);
  }
  const ownedWorkspaceIds = [...new Set((owners ?? []).map((row) => row.workspace_id))];

  // Apps/keywords scoped to owned workspaces rather than a bare
  // `select("workspace_id")`: an unfiltered scan of `keywords` (which grows
  // much faster than `apps`) risks a statement timeout that fails only this
  // one query — and since none of these results used to check `.error`,
  // that failure silently rendered as "0 keywords" for every user instead
  // of surfacing anywhere.
  const noRows = { data: [], error: null } as const;
  const [
    { data: apps, error: appsErr },
    { data: keywords, error: keywordsErr },
    { data: subscriptions, error: subsErr },
    { data: plans, error: plansErr },
  ] = await Promise.all([
    ownedWorkspaceIds.length === 0 ? noRows : admin.from("apps").select("workspace_id").in("workspace_id", ownedWorkspaceIds),
    ownedWorkspaceIds.length === 0 ? noRows : admin.from("keywords").select("workspace_id").in("workspace_id", ownedWorkspaceIds),
    admin.from("subscriptions").select("user_id, plan_id, status").in("status", ["active", "trialing"]),
    admin.from("plans").select("id, slug, name"),
  ]);
  if (appsErr) throw appsErr;
  if (keywordsErr) throw keywordsErr;
  if (subsErr) throw subsErr;
  if (plansErr) throw plansErr;

  const appCountByWorkspace = new Map<string, number>();
  for (const a of apps ?? []) {
    appCountByWorkspace.set(a.workspace_id, (appCountByWorkspace.get(a.workspace_id) ?? 0) + 1);
  }

  const keywordCountByWorkspace = new Map<string, number>();
  for (const k of keywords ?? []) {
    keywordCountByWorkspace.set(k.workspace_id, (keywordCountByWorkspace.get(k.workspace_id) ?? 0) + 1);
  }

  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const freePlan = (plans ?? []).find((p) => p.slug === "free");

  // No active/trialing subscription row falls back to the free plan —
  // matches get_effective_plan's fallback in the DB.
  const activePlanByUser = new Map<string, { slug: string; name: string }>();
  for (const s of subscriptions ?? []) {
    const plan = planById.get(s.plan_id);
    if (plan) activePlanByUser.set(s.user_id, { slug: plan.slug, name: plan.name });
  }

  const rows: AdminUserRow[] = authUsers.map((u) => {
    const workspaceIds = ownedWorkspacesByUser.get(u.id) ?? [];
    const appCount = workspaceIds.reduce((sum, id) => sum + (appCountByWorkspace.get(id) ?? 0), 0);
    const keywordCount = workspaceIds.reduce((sum, id) => sum + (keywordCountByWorkspace.get(id) ?? 0), 0);
    const plan = activePlanByUser.get(u.id) ?? (freePlan ? { slug: freePlan.slug, name: freePlan.name } : { slug: "free", name: "Free" });

    return {
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
      appCount,
      keywordCount,
      planSlug: plan.slug,
      planName: plan.name,
    };
  });

  rows.sort((a, b) => a.email.localeCompare(b.email));

  return <AdminUsersPage users={rows} />;
}
