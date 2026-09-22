// Prompt-building and answer-parsing kept separate from
// /api/ai-visibility/check/route.ts (its only caller) so the two concerns
// — talking to Gemini vs. the route's plan-gating/DB-upsert logic — stay
// independently testable.

import { generateText } from "@/libs/gemini";
import { findRankIdx } from "@/libs/keyword-rank-match";

export type VisibilityMention = { name: string; position: number; reason: string };
export type GeminiVisibilityAnswer = { apps: VisibilityMention[]; narrative: string };

export type DerivedCheck = {
  mentioned: boolean;
  position: number | null;
  competitorApps: VisibilityMention[];
  snippet: string | null;
};

function buildVisibilityPrompt(prompt: string): string {
  return `You are simulating how an AI assistant (like ChatGPT, Gemini, or an AI-powered app store search) would answer a real user's app-discovery question.

User's question: "${prompt}"

Answer as that assistant would: recommend specific, real mobile apps (iOS or Android) that best fit this request. Most users asking a question like this expect a short list of named apps, not a generic explanation, so enumerate real, specific app names whenever the question calls for an app recommendation.

Reply with ONLY this JSON shape, no explanation, no markdown fences:
{"apps": [{"name": "Exact app name as commonly listed in the App Store or Google Play", "reason": "One short clause on why this app was recommended"}], "narrative": "The 2-4 sentence answer you'd actually give the user, in plain prose"}

Rules:
- "apps" must be ordered the same way you'd present them to the user (most recommended first) — this order will be treated as a ranking.
- Only include apps you would genuinely recommend for this exact question. Use an empty array if the question doesn't call for specific app recommendations.
- Do not invent apps that don't exist. Use each app's real, commonly known name.
- List at most 10 apps.`;
}

// Never includes the tracked app's own name in the prompt — asking the
// model "does app X show up for prompt Y" would bias the answer and defeat
// the point of simulating a neutral AI search. The generic question is
// asked once per prompt text and shared across every app/workspace
// tracking it; each app's own mention is derived separately via
// deriveCheck below.
export async function fetchVisibilityAnswer(prompt: string): Promise<GeminiVisibilityAnswer | null> {
  const raw = await generateText(buildVisibilityPrompt(prompt), 0);
  if (!raw) return null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { apps?: unknown; narrative?: unknown };
    const apps = (Array.isArray(parsed.apps) ? parsed.apps : [])
      .filter((a): a is { name: unknown; reason: unknown } => typeof a === "object" && a !== null)
      .map((a, i) => ({
        name: typeof a.name === "string" ? a.name.trim() : "",
        reason: typeof a.reason === "string" ? a.reason.trim() : "",
        position: i + 1,
      }))
      .filter((a) => a.name.length > 0)
      .slice(0, 10);
    const narrative = typeof parsed.narrative === "string" ? parsed.narrative.trim() : "";
    return { apps, narrative };
  } catch {
    return null;
  }
}

// Matches a tracked app's own name against a shared answer's enumerated
// apps, using the same fuzzy name matcher the live keyword-rank routes use.
export function deriveCheck(answer: GeminiVisibilityAnswer, appName: string): DerivedCheck {
  const idx = findRankIdx(answer.apps.map((a) => a.name), appName);
  const mentioned = idx >= 0;
  return {
    mentioned,
    position: mentioned ? idx + 1 : null,
    competitorApps: answer.apps.filter((_, i) => i !== idx),
    snippet: mentioned ? answer.apps[idx].reason : (answer.narrative.slice(0, 240) || null),
  };
}
