import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// GET /api/push/app-status?appId=...
// Whether the current user has rank-change alerts enabled for this app —
// feeds NotificationToggle.tsx's initial state.
export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");
  if (!appId) return NextResponse.json({ error: "Missing appId" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("push_app_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("app_id", appId)
    .maybeSingle();

  return NextResponse.json({ enabled: !!data });
}
