"use server";

import { redirect } from "next/navigation";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { VIEW_ONLY_ERROR } from "@/libs/admin/impersonation";
import { deleteUserAndData } from "@/libs/account/delete-user";

export type AccountState = { error?: string; success?: string } | null;

export async function updateProfileAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  if (await isImpersonating()) return { error: VIEW_ONLY_ERROR };
  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) return { error: "Name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: "Profile updated." };
}

// Permanently deletes the signed-in user and everything they own — see
// deleteUserAndData for exactly what that covers.
export async function deleteAccountAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  if (await isImpersonating()) return { error: VIEW_ONLY_ERROR };
  const confirmation = (formData.get("confirmation") as string)?.trim();
  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await deleteUserAndData(user.id);
  if (error) return { error };

  // The session's user no longer exists; clear the auth cookies locally.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
