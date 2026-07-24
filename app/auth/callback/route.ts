import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { isMobileUserAgent } from "@/libs/user-agent";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create default workspace if this is a new OAuth user
      const { count } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", data.user.id);

      const isFirstLogin = count === 0;

      if (isFirstLogin) {
        const displayName =
          data.user.user_metadata?.full_name ??
          data.user.email?.split("@")[0] ??
          "My";

        await supabase.rpc("create_default_workspace", {
          p_user_id: data.user.id,
          p_name: displayName,
        });
      }

      // First-ever login always lands on /dashboard, even on mobile —
      // there's no app tracked yet for /mobile to show anything useful for.
      // Returning logins on mobile go to /mobile instead.
      const redirectPath = next?.startsWith("/")
        ? next
        : !isFirstLogin && isMobileUserAgent(request.headers.get("user-agent") ?? "")
          ? "/mobile"
          : "/dashboard";

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
