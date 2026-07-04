"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import type { AuthState } from "@/libs/contracts";

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "All fields are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !email || !password || !confirm)
    return { error: "All fields are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters.", field: "password" };
  if (password !== confirm)
    return { error: "Passwords do not match.", field: "confirm" };

  const supabase = await createClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (signUpError) return { error: signUpError.message };
  if (!data.user) return { error: "Failed to create account." };

  // The signup trigger already joined any workspace(s) this email was
  // invited to — only create a default workspace if none of those applied.
  const { count } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", data.user.id);

  if (count === 0) {
    const { error: workspaceError } = await supabase.rpc("create_default_workspace", {
      p_user_id: data.user.id,
      p_name: name,
    });

    if (workspaceError) return { error: "Account created but workspace setup failed. Please contact support." };
  }

  redirect("/dashboard");
}

export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !password || !confirm) return { error: "All fields are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters.", field: "password" };
  if (password !== confirm)
    return { error: "Passwords do not match.", field: "confirm" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({
    password,
    data: { full_name: name, invite_pending: false },
  });

  if (error) return { error: error.message };

  await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);

  redirect("/dashboard");
}
