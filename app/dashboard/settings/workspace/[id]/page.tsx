import { notFound, redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import WorkspacePage from "@/features/workspace/WorkspacePage";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/libs/contracts";

type PageProps = { params: Promise<{ id: string }> };

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: workspace, error: wsError },
    { data: rawMembers },
    { data: allWorkspaces },
  ] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", id).single(),
    supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role, joined_at")
      .eq("workspace_id", id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  if (wsError || !workspace) notFound();

  const memberList = rawMembers ?? [];
  const currentMember = memberList.find((m) => m.user_id === user.id);
  if (!currentMember) notFound();

  const memberUserIds = memberList.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberUserIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const members = memberList.map((m) => ({
    ...m,
    profiles: profileMap[m.user_id] ?? null,
  }));

  return (
    <WorkspacePage
      workspace={workspace as Workspace}
      members={
        members as (WorkspaceMember & {
          profiles: { full_name: string | null } | null;
        })[]
      }
      currentUserId={user.id}
      currentUserRole={currentMember.role as WorkspaceRole}
      allWorkspaces={(allWorkspaces ?? []) as Workspace[]}
    />
  );
}
