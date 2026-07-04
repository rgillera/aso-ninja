"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import type { WorkspaceAccess, WorkspaceUsage } from "@/libs/contracts";

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
  const email = (formData.get("email") as string).trim().toLowerCase();
  const access = formData.getAll("access") as WorkspaceAccess[];

  if (access.length === 0) return { error: "Select at least one access area." };

  const supabase = await createClient();

  const { data: usageData, error: usageError } = await supabase
    .rpc("get_workspace_usage", { p_workspace_id: workspaceId })
    .single();

  if (usageError) return { error: usageError.message };
  const usage = usageData as WorkspaceUsage;
  if (usage.member_limit !== null && usage.member_count >= usage.member_limit) {
    return {
      error: `Member limit reached for this workspace's plan (${usage.member_limit} members). Upgrade to add more.`,
    };
  }

  const { data: userId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { p_email: email }
  );

  if (lookupError) return { error: lookupError.message };

  if (!userId) {
    const {
      data: { user: invitedBy },
    } = await supabase.auth.getUser();

    const { error: inviteError } = await supabase
      .from("workspace_invites")
      .upsert(
        { workspace_id: workspaceId, email, role: "member", access, invited_by: invitedBy?.id },
        { onConflict: "workspace_id,email" }
      );

    if (inviteError) return { error: inviteError.message };

    const admin = createAdminClient();
    const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/invite`,
      data: { invite_pending: true },
    });

    if (sendError) return { error: sendError.message };

    return { success: `Invite sent to ${email}. They'll join once they register.` };
  }

  const { error } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userId, role: "member", access });

  if (error?.code === "23505") return { error: "This user is already a member." };
  if (error) return { error: error.message };

  return { success: `Invitation sent to ${email}.` };
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
