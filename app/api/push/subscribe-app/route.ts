import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/push/subscribe-app
// Body: { appId }
//
// Opts this user in to rank-change alerts for one specific app. Separate
// from /api/push/subscribe (which registers the device's push endpoint) so
// a device registers once and apps are toggled in/out independently here.
export async function POST(request: NextRequest) {
  const { appId } = await request.json() as { appId?: string };
  if (!appId) return NextResponse.json({ error: "Missing appId" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS on `apps` (see supabase/migrations/20260626000002_apps.sql) already
  // scopes reads to the caller's own workspaces, so an appId they can't see
  // just comes back null rather than needing an explicit membership check.
  const { data: app } = await supabase.from("apps").select("id").eq("id", appId).maybeSingle();
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("push_app_subscriptions")
    .upsert({ user_id: user.id, app_id: appId }, { onConflict: "user_id,app_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
