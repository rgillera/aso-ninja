import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import type { MentionedApp } from "@/libs/contracts";

export type TrackedPromptLatest = {
  checkedOn: string;
  mentioned: boolean;
  position: number | null;
  competitorApps: MentionedApp[];
  snippet: string | null;
};

export type TrackedPrompt = {
  promptId: string;
  prompt: string;
  latest: TrackedPromptLatest | null;
};

export type AiVisibilityHistoryPoint = { date: string; count: number };

export type AiVisibilityListResult = {
  prompts: TrackedPrompt[];
  history: AiVisibilityHistoryPoint[];
};

// GET /api/ai-visibility/list?appId=<uuid>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId") ?? "";

  if (!appId) return NextResponse.json({ prompts: [], history: [] } satisfies AiVisibilityListResult);

  const supabase = await createClient();

  const { data: trackedRows } = await supabase
    .from("app_ai_visibility_prompts")
    .select("prompt_id, added_at, ai_visibility_prompts!inner(id, prompt)")
    .eq("app_id", appId)
    // Newest tracked first — promptText below is built in this same order
    // (a Map preserves insertion order), which the final `prompts` array
    // then inherits.
    .order("added_at", { ascending: false });

  if (!trackedRows?.length) return NextResponse.json({ prompts: [], history: [] } satisfies AiVisibilityListResult);

  const promptText = new Map<string, string>();
  for (const row of trackedRows as unknown as { prompt_id: string; added_at: string; ai_visibility_prompts: { id: string; prompt: string } }[]) {
    promptText.set(row.prompt_id, row.ai_visibility_prompts.prompt);
  }

  const { data: checkRows } = await supabase
    .from("ai_visibility_checks")
    .select("prompt_id, checked_on, mentioned, position, competitor_apps, snippet")
    .eq("app_id", appId)
    .order("checked_on", { ascending: false })
    .limit(5000);

  // First row per prompt_id wins (checked_on desc) — the same "latest" trick
  // app/api/keywords/ranked/route.ts uses for entry.latest.
  const latestByPrompt = new Map<string, TrackedPromptLatest>();
  const dateMap = new Map<string, Set<string>>();

  for (const row of checkRows ?? []) {
    if (!latestByPrompt.has(row.prompt_id)) {
      latestByPrompt.set(row.prompt_id, {
        checkedOn: row.checked_on,
        mentioned: row.mentioned,
        position: row.position,
        competitorApps: (row.competitor_apps ?? []) as MentionedApp[],
        snippet: row.snippet,
      });
    }
    if (row.mentioned) {
      if (!dateMap.has(row.checked_on)) dateMap.set(row.checked_on, new Set());
      dateMap.get(row.checked_on)!.add(row.prompt_id);
    }
  }

  const prompts: TrackedPrompt[] = [...promptText.entries()].map(([promptId, prompt]) => ({
    promptId,
    prompt,
    latest: latestByPrompt.get(promptId) ?? null,
  }));

  const history: AiVisibilityHistoryPoint[] = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ids]) => ({ date, count: ids.size }));

  return NextResponse.json({ prompts, history } satisfies AiVisibilityListResult);
}
