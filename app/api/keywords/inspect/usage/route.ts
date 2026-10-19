import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { inspectorDailyLimit, type InspectorUsage } from "@/features/aso/keywords/inspector/limits";

// GET /api/keywords/inspect/usage?workspaceId=<uuid>
// The signed-in user's Keyword Inspector allowance for today (UTC), so the
// page can show what's left before the first lookup. Each inspection's
// response carries the same shape afterwards. limit null = unlimited.
export async function GET(request: NextRequest) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const limit = inspectorDailyLimit(planSlug);
  if (limit === null) return NextResponse.json({ used: 0, limit } satisfies InspectorUsage);

  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("keyword_inspector_lookups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("day", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ used: count ?? 0, limit } satisfies InspectorUsage);
}
