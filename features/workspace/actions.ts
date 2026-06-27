"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import type { WorkspaceRole } from "@/libs/contracts";

export type WorkspaceState = { error?: string; success?: string } | null;

export async function updateWorkspaceAction(
  _prev: WorkspaceState,
  formData: FormData
): Promise<WorkspaceState> {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  if (!name.trim()) return { error: "Workspace name is required." };
  if (!/^[a-z0-9-]+$/.test(slug)) return { error: "Slug can only contain lowercase letters, numbers, and hyphens." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name: name.trim(), slug: slug.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: "Workspace updated." };
}

export async function inviteMemberAction(
  _prev: WorkspaceState,
  formData: FormData
): Promise<WorkspaceState> {
  const workspaceId = formData.get("workspace_id") as string;
  const email = formData.get("email") as string;
  const role = (formData.get("role") as WorkspaceRole) ?? "member";

  const supabase = await createClient();

  const { data: userId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { p_email: email }
  );

  if (lookupError || !userId) return { error: "No user found with that email address." };

  const { error } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userId, role });

  if (error?.code === "23505") return { error: "This user is already a member." };
  if (error) return { error: error.message };

  return { success: `Invitation sent to ${email}.` };
}

export async function updateMemberRoleAction(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
}

export async function removeMemberAction(
  workspaceId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
}

export async function createWorkspaceAction(
  _prev: WorkspaceState,
  formData: FormData
): Promise<WorkspaceState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Workspace name is required." };

  const supabase = await createClient();
  const { data: workspaceId, error } = await supabase.rpc("create_workspace", {
    p_name: name,
  });

  if (error) return { error: error.message };
  redirect(`/dashboard/settings/workspace/${workspaceId}`);
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("workspaces").delete().eq("id", workspaceId);
  redirect("/dashboard");
}
