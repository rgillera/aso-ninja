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
  const next = formData.get("next") as string | null;

  if (!email || !password) return { error: "All fields are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect(next?.startsWith("/") ? next : "/dashboard");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  const next = formData.get("next") as string | null;
  const safeNext = next?.startsWith("/") ? next : null;

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
    options: {
      data: { full_name: name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
    },
  });

  if (signUpError) return { error: signUpError.message };
  if (!data.user) return { error: "Failed to create account." };

  // No session means email confirmation is required before the account is
  // active — the workspace gets created in /auth/callback once they confirm.
  if (!data.session) {
    const verifyUrl = `/signup/verify-email?email=${encodeURIComponent(email)}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`;
    redirect(verifyUrl);
  }

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

  redirect(safeNext ?? "/dashboard");
}

export type ResendState = { error?: string; success?: boolean } | null;

export async function resendVerificationEmailAction(
  _prev: ResendState,
  formData: FormData
): Promise<ResendState> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };
  const next = formData.get("next") as string | null;
  const safeNext = next?.startsWith("/") ? next : null;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
    },
  });

  if (error) return { error: error.message };

  return { success: true };
}

export type ForgotPasswordState = { error?: string; success?: boolean } | null;

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || !confirm) return { error: "All fields are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters.", field: "password" };
  if (password !== confirm)
    return { error: "Passwords do not match.", field: "confirm" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = formData.get("next") as string | null;
  const safeNext = next?.startsWith("/") ? next : null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
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
