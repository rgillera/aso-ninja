import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { fetchVisibilityAnswer, deriveCheck, type GeminiVisibilityAnswer } from "@/libs/ai-visibility";
import type { TrackedPromptLatest } from "@/app/api/ai-visibility/list/route";

// POST /api/ai-visibility/check
// Body: { appId, promptId, workspaceId } — the manual "Check again".
//
// Looks for today's shared ai_visibility_answers row for this prompt's text
// first; if another app/workspace tracking the same prompt already
// triggered a check today, this skips the Gemini call entirely and just
// derives + upserts this app's own check from the existing answer. Only
// calls Gemini on a genuine first-of-the-day check for that prompt text.
// There's no automatic recurring re-check (see
// 20260922000001_drop_ai_visibility_refresh_cron.sql) — every check past
// the first one is a deliberate "Check again" click, so cost tracks actual
// usage instead of the number of prompts ever added.
export async function POST(request: NextRequest) {
  const body = await request.json() as { appId?: string; promptId?: string; workspaceId?: string };
  const { appId, promptId, workspaceId } = body;
  if (!appId || !promptId || !workspaceId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const planState = await getWorkspacePlanState(workspaceId);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "AI Visibility requires the Pro+ plan or above." }, { status: 403 });
  }

  const supabase = await createClient();

  const [{ data: promptRow }, { data: appRow }] = await Promise.all([
    supabase.from("ai_visibility_prompts").select("prompt").eq("id", promptId).maybeSingle(),
    supabase.from("apps").select("name").eq("id", appId).maybeSingle(),
  ]);

  if (!promptRow || !appRow) {
    return NextResponse.json({ error: "Prompt or app not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existingAnswer } = await admin
    .from("ai_visibility_answers")
    .select("mentioned_apps, raw_answer")
    .eq("prompt", promptRow.prompt)
    .eq("provider", "gemini")
    .eq("checked_on", today)
    .maybeSingle();

  let answer: GeminiVisibilityAnswer | null = existingAnswer
    ? { apps: existingAnswer.mentioned_apps ?? [], narrative: existingAnswer.raw_answer ?? "" }
    : null;

  if (!answer) {
    answer = await fetchVisibilityAnswer(promptRow.prompt);
    if (!answer) return NextResponse.json({ error: "Couldn't reach the AI service right now." }, { status: 502 });

    await admin.from("ai_visibility_answers").upsert(
      { prompt: promptRow.prompt, provider: "gemini", checked_on: today, mentioned_apps: answer.apps, raw_answer: answer.narrative },
      { onConflict: "prompt,provider,checked_on" }
    );
  }

  const check = deriveCheck(answer, appRow.name);

  const { error: upsertErr } = await supabase.from("ai_visibility_checks").upsert(
    {
      app_id: appId,
      prompt_id: promptId,
      provider: "gemini",
      checked_on: today,
      mentioned: check.mentioned,
      position: check.position,
      competitor_apps: check.competitorApps,
      snippet: check.snippet,
    },
    { onConflict: "app_id,prompt_id,checked_on" }
  );

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  const latest: TrackedPromptLatest = {
    checkedOn: today,
    mentioned: check.mentioned,
    position: check.position,
    competitorApps: check.competitorApps,
    snippet: check.snippet,
  };

  return NextResponse.json({ latest });
}
