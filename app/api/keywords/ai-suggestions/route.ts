import { NextRequest, NextResponse } from "next/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

const OLLAMA_HOST      = process.env.OLLAMA_HOST      ?? "http://localhost:11434";
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "llama3.2";
const OLLAMA_API_KEY   = process.env.OLLAMA_API_KEY    ?? "";

export type AISuggestionsResult = {
  discovery:  { term: string; volume: number }[];
  generic:    { term: string; volume: number }[];
  branded:    { term: string; volume: number }[];
  relevancy:  { term: string; volume: number }[];
};

async function generateKeywords(
  appName: string,
  description: string,
  category: "discovery" | "generic" | "branded" | "relevancy",
  count: number,
): Promise<string[]> {
  const prompts: Record<typeof category, string> = {
    discovery: `You are an App Store Optimization expert. Generate ${count} discovery keywords for the app "${appName}".
Description: ${description.slice(0, 400)}

Discovery keywords are niche, long-tail, or specific-use-case keywords that users search when they know exactly what they want.
Examples: "calorie tracker for runners", "intermittent fasting timer", "macro calculator keto"

Rules:
- 1-3 words each
- No brand names of competitors
- Relevant to this specific app's functionality
- Mix of single words and short phrases

Reply with ONLY a JSON array of strings. Example: ["keyword one","keyword two"]`,

    generic: `You are an App Store Optimization expert. Generate ${count} high-volume generic keywords for the app "${appName}".
Description: ${description.slice(0, 400)}

Generic keywords are broad, high-search-volume terms that millions of users search.
Examples: "calorie counter", "food tracker", "diet app", "weight loss"

Rules:
- 1-3 words each
- Broad and competitive terms
- No brand names
- Very high search volume potential

Reply with ONLY a JSON array of strings. Example: ["keyword one","keyword two"]`,

    branded: `You are an App Store Optimization expert. Generate ${count} competitor brand keywords related to the app "${appName}".
Description: ${description.slice(0, 400)}

Branded keywords are competitor app names or variations that users might search.
Examples: "myfitnesspal alternative", "lose it app", "cronometer"

Rules:
- Competitor app names in this category
- App name variations
- Include both the brand name alone and with "alternative" or similar

Reply with ONLY a JSON array of strings. Example: ["keyword one","keyword two"]`,

    relevancy: `You are an App Store Optimization expert. Generate ${count} high-relevancy keywords for the app "${appName}".
Description: ${description.slice(0, 400)}

High-relevancy keywords are terms that are a perfect or near-perfect match to what this app does — users searching these terms would very likely download this app.
Examples for a calorie tracker: "log meals", "nutrition diary", "daily calorie goal"

Rules:
- 1-3 words each
- Must directly describe a core feature or benefit of the app
- No brand names
- Terms a user would search specifically to find this type of app

Reply with ONLY a JSON array of strings. Example: ["keyword one","keyword two"]`,
  };

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": OLLAMA_API_KEY },
      body: JSON.stringify({
        model: OLLAMA_LLM_MODEL,
        prompt: prompts[category],
        stream: false,
        options: { temperature: 0.4 },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (!res.ok) return [];
    const data = await res.json();
    const raw = (data.response ?? "") as string;
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as unknown[];
    return parsed
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.toLowerCase().trim())
      .filter((k) => k.length >= 2 && k.length <= 50)
      .slice(0, count);
  } catch { return []; }
}

// Deduplicate terms across sections (earlier sections take priority).
// Also deduplicates within each section.
function deduplicateAcross(...sections: string[][]): string[][] {
  const seen = new Set<string>();
  return sections.map((terms) => {
    const out: string[] = [];
    for (const t of terms) {
      if (!seen.has(t)) { seen.add(t); out.push(t); }
    }
    return out;
  });
}

const EMPTY: AISuggestionsResult = { discovery: [], generic: [], branded: [], relevancy: [] };

// GET /api/keywords/ai-suggestions?appName=...&country=us&workspaceId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appName     = searchParams.get("appName")     ?? "";
  const description = searchParams.get("description") ?? "";
  const workspaceId = searchParams.get("workspaceId") ?? "";

  if (!appName) return NextResponse.json(EMPTY);

  // AI Suggestions is a Pro+ feature — anything below that plan never
  // triggers the Ollama LLM pass.
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) return NextResponse.json(EMPTY);

  const [rawDiscovery, rawGeneric, rawBranded, rawRelevancy] = await Promise.all([
    generateKeywords(appName, description, "discovery", 40),
    generateKeywords(appName, description, "generic",   50),
    generateKeywords(appName, description, "branded",   30),
    generateKeywords(appName, description, "relevancy", 30),
  ]);

  const [discoveryTerms, genericTerms, brandedTerms, relevancyTerms] =
    deduplicateAcross(rawDiscovery, rawGeneric, rawBranded, rawRelevancy);

  return NextResponse.json({
    discovery: discoveryTerms.map((term) => ({ term, volume: 0 })),
    generic:   genericTerms.map((term)   => ({ term, volume: 0 })),
    branded:   brandedTerms.map((term)   => ({ term, volume: 0 })),
    relevancy: relevancyTerms.map((term) => ({ term, volume: 0 })),
  } satisfies AISuggestionsResult);
}
