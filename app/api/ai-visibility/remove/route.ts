import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// POST /api/ai-visibility/remove
// Body: { appId, promptIds: string[] }
//
// Untracks prompts from an app (deletes the app_ai_visibility_prompts link
// + this app's own ai_visibility_checks rows for those prompts), mirroring
// /api/keywords/remove. Leaves the shared ai_visibility_prompts row and any
// ai_visibility_answers alone — other apps/workspaces may still be tracking
// the same prompt text.
export async function POST(request: NextRequest) {
  const body = await request.json() as { appId?: string; promptIds?: string[] };
  const { appId, promptIds } = body;
  if (!appId || !promptIds?.length) return NextResponse.json({ ok: true });

  const supabase = await createClient();

  await supabase
    .from("app_ai_visibility_prompts")
    .delete()
    .eq("app_id", appId)
    .in("prompt_id", promptIds);

  await supabase
    .from("ai_visibility_checks")
    .delete()
    .eq("app_id", appId)
    .in("prompt_id", promptIds);

  return NextResponse.json({ ok: true });
}
