import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/push/subscribe
// Body: { endpoint, p256dh, auth }
//
// Upserts this browser's Web Push subscription for the current user. Keyed
// on endpoint (unique per browser+origin registration) so re-subscribing
// from the same device updates in place instead of accumulating duplicates.
export async function POST(request: NextRequest) {
  const { endpoint, p256dh, auth } = await request.json() as {
    endpoint?: string; p256dh?: string; auth?: string;
  };
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth_key: auth },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
