import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const maxDuration = 60;

// Ends the grace period given to workspaces that already tracked more apps
// (or countries) than the Free plan's limit when it dropped to 1: clears
// workspaces.app_limit_grace_until once it passes and freezes whatever is
// over the limit, keeping the app the user picked (apps.pinned_at). See
// supabase/migrations/20261017000002_free_app_limit_grace.sql.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: expired, error } = await supabase.rpc("expire_app_limit_grace");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expired });
}
