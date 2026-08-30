import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/libs/gemini";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { MAX_COMPARE_APPS } from "@/features/market/compare/types";

export type CompareInsightApp = {
  name: string;
  store: "ios" | "android";
  developer: string;
  category: string;
  rating: number | null;
  ratingCount: number | null;
  daysSinceUpdate: number | null;
  screenshotCount: number;
  hasPreviewVideo: boolean;
  titleLength: number;
  titleLimit: number;
  subtitleLength: number;
  subtitleLimit: number;
  descriptionLength: number;
  // Top repeated terms/phrases from computeKeywordDensity (@/features/aso/metadata/preview/KeywordDensity) — the
  // same computation CompareTable's own "Keyword density" row already runs.
  topKeywords: { term: string; density: number }[];
  // Terms present in this app's topKeywords but in no other compared app's —
  // computed by the caller (a plain set difference), not the model, so the
  // model only ever judges real extracted terms instead of inventing any.
  uniqueKeywords: string[];
};

export type CompareInsightsResult = { summary: string; gapNotes: (string | null)[] };

function formatApp(app: CompareInsightApp, index: number): string {
  const lines = [
    `${index + 1}. ${app.name} (${app.store === "ios" ? "App Store" : "Google Play"}) — ${app.developer || "Unknown developer"}`,
    `   Category: ${app.category} | Rating: ${app.rating != null ? app.rating.toFixed(1) : "n/a"}${app.ratingCount != null ? ` (${app.ratingCount})` : ""} | Last updated: ${app.daysSinceUpdate != null ? `${app.daysSinceUpdate} days ago` : "unknown"}`,
    `   Screenshots: ${app.screenshotCount} | Preview video: ${app.hasPreviewVideo ? "Yes" : "No"}`,
    `   Title: ${app.titleLength}/${app.titleLimit} chars | Subtitle: ${app.subtitleLength}/${app.subtitleLimit} chars | Description: ${app.descriptionLength} chars`,
  ];
  if (app.topKeywords.length > 0) {
    lines.push(`   Top description keywords: ${app.topKeywords.map((k) => `${k.term} (${k.density.toFixed(1)}%)`).join(", ")}`);
  }
  lines.push(
    app.uniqueKeywords.length > 0
      ? `   Keywords none of the other compared apps use: ${app.uniqueKeywords.join(", ")}`
      : `   No keywords unique to this app among the compared set.`
  );
  return lines.join("\n");
}

function buildPrompt(apps: CompareInsightApp[]): string {
  return `You are an App Store Optimization (ASO) expert comparing ${apps.length} competing apps side by side.

${apps.map(formatApp).join("\n\n")}

Write:
1. "summary": a 3-5 sentence plain-English overview comparing these apps for someone sizing up this competitive set — call out who leads on rating, freshness, or screenshots, and any easy metadata wins (e.g. an app not using its full title/subtitle character limit).
2. "gapNotes": an array with exactly ${apps.length} entries, in the same order as the apps listed above. For each app: if it has keywords unique to it, write ONE short sentence judging whether that gap looks like a real ASO opportunity the other apps are missing, or just generic filler not worth chasing. If it has no unique keywords, use null for that entry.

Reply with ONLY this JSON shape, no explanation, no markdown fences:
{"summary": "...", "gapNotes": ["...", null]}`;
}

// POST /api/market/compare/insights  { workspaceId, apps: CompareInsightApp[] }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const apps = (Array.isArray(body.apps) ? body.apps : []) as CompareInsightApp[];

  if (apps.length < 2) {
    return NextResponse.json({ error: "Add at least 2 apps to generate insights." }, { status: 400 });
  }

  // Same cost-control shape as /api/keywords/ai-suggestions — verify the
  // workspace's actual plan server-side rather than trusting the client's
  // own lock check, which a direct API call could otherwise bypass.
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "AI Insights requires the Pro+ plan or above." }, { status: 403 });
  }

  const prompt = buildPrompt(apps.slice(0, MAX_COMPARE_APPS));
  const raw = await generateText(prompt, 0.4);
  if (!raw) return NextResponse.json({ error: "Couldn't reach the AI service right now." }, { status: 502 });

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
    const parsed = JSON.parse(match[0]) as { summary?: unknown; gapNotes?: unknown };
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const gapNotesRaw = Array.isArray(parsed.gapNotes) ? parsed.gapNotes : [];
    if (!summary) return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });

    const result: CompareInsightsResult = {
      summary,
      gapNotes: apps.map((_, i) => {
        const v = gapNotesRaw[i];
        return typeof v === "string" && v.trim() ? v.trim() : null;
      }),
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
  }
}
