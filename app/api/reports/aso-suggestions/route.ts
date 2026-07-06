import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { Suggestion } from "@/features/aso/reports/asoSuggestions";
import { OLLAMA_HOST, OLLAMA_LLM_MODEL, ollamaHeaders } from "@/libs/ollama";

// Matches the revalidate window the store-data fetchers already use
// (libs/store/appstore.ts, libs/store/googleplay.ts) — the metadata driving
// this prompt doesn't change faster than that, and an LLM call is far more
// expensive than a cache hit.
const CACHE_REVALIDATE_SECONDS = 6 * 60 * 60;

type RequestBody = {
  workspaceId?: string;
  appName: string;
  isIos: boolean;
  title: string;
  subtitle: string;
  description: string;
  category?: string;
  rating?: number;
  ratingCount?: number;
  daysSinceUpdate?: number;
  screenshotCount: number;
  hasPreviewVideo: boolean;
  // Titles of suggestions the deterministic checks already surfaced, so the
  // model adds to that list instead of restating it.
  alreadyFlagged: string[];
};

// Throws instead of returning [] on any failure — unstable_cache only caches
// a *resolved* value, so a rejected call is never persisted. Letting an
// empty/unparseable Ollama response reject here (instead of silently
// caching "no suggestions") means a transient hiccup or an off run of the
// model gets retried fresh next time, not frozen for the whole revalidate
// window.
async function generateSuggestions(body: RequestBody): Promise<Suggestion[]> {
  const store = body.isIos ? "iOS App Store" : "Google Play";
  const prompt = `You are a senior App Store Optimization (ASO) specialist reviewing a real app's store listing. Give specific, actionable ASO recommendations for THIS app based on the actual metadata below — not generic advice that could apply to any app.

App name: ${body.appName}
Platform: ${store}
Category: ${body.category || "Unknown"}
Title: ${body.title}
Subtitle: ${body.subtitle}
Description (excerpt): ${body.description.slice(0, 800)}
Rating: ${body.rating ?? "N/A"} (${body.ratingCount ?? 0} ratings)
Days since last update: ${body.daysSinceUpdate ?? "Unknown"}
Screenshot count: ${body.screenshotCount}
Has preview video: ${body.hasPreviewVideo ? "Yes" : "No"}

These issues were already flagged by a separate rules-based checker — do NOT repeat them or suggest close variations of them:
${body.alreadyFlagged.length ? body.alreadyFlagged.map((t) => `- ${t}`).join("\n") : "(none)"}

Give as many NEW ASO recommendations as you can genuinely justify from the metadata above — don't pad the list with generic filler, but don't stop at just one or two either. Cover different angles: missing keyword opportunities given the category, weak or missing calls to action, underused features not mentioned in the description, localization gaps, stale update cadence, thin visual assets, positioning against likely competitors, and anything else a specialist reviewing this exact listing would flag. Skip anything you're not confident applies to this specific app.

Reply with ONLY a JSON array of objects, nothing else. Example:
[{"title":"Short, specific title","description":"1-2 sentence explanation of the issue and fix."}]`;

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: ollamaHeaders(),
    body: JSON.stringify({
      model: OLLAMA_LLM_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.4 },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (!res.ok) throw new Error(`ollama generate failed: ${res.status}`);
  const data = await res.json();
  const raw = (data.response ?? "") as string;
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("ollama response had no JSON array");
  const parsed = JSON.parse(match[0]) as unknown[];
  const suggestions = parsed
    .filter((s): s is Suggestion =>
      !!s && typeof s === "object" &&
      typeof (s as Suggestion).title === "string" &&
      typeof (s as Suggestion).description === "string"
    )
    .slice(0, 12);
  if (suggestions.length === 0) throw new Error("ollama returned no usable suggestions");
  return suggestions;
}

const cachedGenerateSuggestions = unstable_cache(generateSuggestions, ["report-aso-suggestions"], { revalidate: CACHE_REVALIDATE_SECONDS });

// POST /api/reports/aso-suggestions
// LLM-generated ASO recommendations layered on top of the always-on
// deterministic checks in features/aso/reports/asoSuggestions.ts — gated to
// Pro+ same as the other Ollama-backed feature (/api/keywords/ai-suggestions),
// since both hit the same local Ollama instance.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;

  if (!body.appName || !body.title) return NextResponse.json({ suggestions: [] });

  const planState = body.workspaceId ? await getWorkspacePlanState(body.workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) return NextResponse.json({ suggestions: [] });

  const suggestions = await cachedGenerateSuggestions(body).catch(() => [] as Suggestion[]);
  return NextResponse.json({ suggestions });
}
