import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getEligibleWorkspaces, getWorkspaceApps } from "@/libs/mobile-nav";

// GET /api/mobile/nav?workspaceId=...
// Feeds features/mobile/NavigationDrawer.tsx — every workspace the user can
// see mobile rankings for, plus the app list for whichever one is currently
// active, so switching either can happen without a full page picker.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [workspaces, apps] = await Promise.all([
    getEligibleWorkspaces(supabase, user.id),
    workspaceId ? getWorkspaceApps(supabase, workspaceId) : Promise.resolve([]),
  ]);

  return NextResponse.json({ workspaces, apps });
}
