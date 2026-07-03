"use server";

import { createClient } from "@/libs/supabase/server";

export type AccountState = { error?: string; success?: string } | null;

export async function updateProfileAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
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
