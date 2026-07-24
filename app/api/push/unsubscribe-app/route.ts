import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/push/unsubscribe-app
// Body: { appId }
//
// Opts this user out of rank-change alerts for one app. Leaves the
// device's push_subscriptions row alone — other apps may still be enabled.
export async function POST(request: NextRequest) {
  const { appId } = await request.json() as { appId?: string };
  if (!appId) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("push_app_subscriptions").delete().eq("user_id", user.id).eq("app_id", appId);
  return NextResponse.json({ ok: true });
}
