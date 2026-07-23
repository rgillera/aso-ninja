import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { WorkspacePicker } from "@/features/mobile/WorkspacePicker";

// Entry point for the mobile rankings monitor. Skips straight to a
// remembered workspace (or the only one, if there's just one) — the picker
// only shows up when there's an actual choice to make.
export default async function MobilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already scopes both queries to this user's own memberships.
  const [{ data: workspaces }, { data: memberships }] = await Promise.all([
    supabase.from("workspaces").select("id, name"),
    supabase.from("workspace_members").select("workspace_id, access").eq("user_id", user.id),
  ]);

  // Same access area that gates /dashboard/keywords etc. on the web — see
  // ASO_INTELLIGENCE_PREFIXES in features/dashboard/DashboardShell.tsx.
  const accessibleIds = new Set(
    (memberships ?? [])
      .filter((m) => (m.access ?? []).includes("aso_intelligence"))
      .map((m) => m.workspace_id)
  );
  const eligible = (workspaces ?? []).filter((w) => accessibleIds.has(w.id));

  if (!eligible.length) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-neutral-500">
        No workspace with ASO Intelligence access yet — open the full dashboard on the web to
        get started.
      </main>
    );
  }

  const cookieStore = await cookies();
  const lastWorkspaceId = cookieStore.get("lastWorkspaceId")?.value;
  const remembered = eligible.find((w) => w.id === lastWorkspaceId);
  if (remembered) redirect(`/mobile/${remembered.id}`);
  if (eligible.length === 1) redirect(`/mobile/${eligible[0].id}`);

  return <WorkspacePicker workspaces={eligible} />;
}
