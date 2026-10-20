import { NextRequest, NextResponse } from "next/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { COUNTRY_MAP } from "@/libs/countries";
import { generateText } from "@/libs/gemini";
import { createClient } from "@/libs/supabase/server";

export type AISuggestionsResult = {
  discovery:  { term: string; volume: number }[];
  generic:    { term: string; volume: number }[];
  branded:    { term: string; volume: number }[];
  relevancy:  { term: string; volume: number }[];
  longtail:   { term: string; volume: number }[];
};

type Category = "discovery" | "generic" | "branded" | "relevancy";

function buildPrompt(
  appName: string,
  description: string,
  category: Category,
  count: number,
  country: string,
): string {
  const market = localeInstructions(country);
  const prompts: Record<Category, string> = {
    // Also returns the long-tail list in the same response, so Long-tail
    // costs no extra Gemini call. Parsed by generateDiscoveryAndLongTail.
    discovery: `You are an App Store Optimization expert. For the app "${appName}", generate two lists:
1. "discovery": ${count} discovery keywords
2. "longtail": ${count} long-tail keywords
Description: ${description.slice(0, 400)}

Discovery keywords are niche or specific-use-case keywords that users search when they know exactly what they want.
Examples: "fasting timer", "macro calculator", "keto tracker"

Long-tail keywords are longer, very specific search phrases with lower competition and high intent.
Examples: "calorie tracker for runners", "intermittent fasting timer for women", "keto macro calculator app"

Rules:
- Discovery: 1-3 words each, mix of single words and short phrases
- Long-tail: 3-5 words each, natural phrases a user would actually type
- No brand names of competitors
- Relevant to this specific app's functionality
- Do not repeat a keyword across the two lists
${market}

Reply with ONLY a JSON object. Example: {"discovery":["keyword one"],"longtail":["longer keyword phrase here"]}`,

    generic: `You are an App Store Optimization expert. Generate ${count} high-volume generic keywords for the app "${appName}".
Description: ${description.slice(0, 400)}

Generic keywords are broad, high-search-volume terms that millions of users search.
Examples: "calorie counter", "food tracker", "diet app", "weight loss"

Rules:
- 1-3 words each
- Broad and competitive terms
- No brand names
- Very high search volume potential
${market}

Reply with ONLY a JSON array of strings. Example: ["keyword one","keyword two"]`,

    branded: `You are an App Store Optimization expert. Generate ${count} competitor brand keywords related to the app "${appName}".
Description: ${description.slice(0, 400)}

Branded keywords are competitor app names or variations that users might search.
Examples: "myfitnesspal alternative", "lose it app", "cronometer"

Rules:
- Competitor app names in this category
- App name variations
- Include both the brand name alone and with "alternative" or similar
${market}

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
${market}

Reply with ONLY a JSON array of strings. Example: ["keyword one","keyword two"]`,
  };
  return prompts[category];
}

async function generateKeywords(
  appName: string,
  description: string,
  category: Exclude<Category, "discovery">,
  count: number,
  country: string,
): Promise<string[]> {
  try {
    const raw = await generateText(buildPrompt(appName, description, category, count, country), 0.4);
    if (!raw) return [];
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return cleanTerms(JSON.parse(match[0]), count, 50);
  } catch { return []; }
}

function cleanTerms(parsed: unknown, count: number, maxLen: number): string[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length >= 2 && k.length <= maxLen)
    .slice(0, count);
}

// The discovery prompt returns {"discovery": [...], "longtail": [...]}.
async function generateDiscoveryAndLongTail(
  appName: string,
  description: string,
  count: number,
  country: string,
): Promise<{ discovery: string[]; longtail: string[] }> {
  const empty = { discovery: [], longtail: [] };
  try {
    const raw = await generateText(buildPrompt(appName, description, "discovery", count, country), 0.4);
    if (!raw) return empty;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return empty;
    const parsed = JSON.parse(match[0]) as { discovery?: unknown; longtail?: unknown };
    return {
      discovery: cleanTerms(parsed.discovery, count, 50),
      longtail:  cleanTerms(parsed.longtail,  count, 70),
    };
  } catch { return empty; }
}

// Keywords only rank for what people type in that storefront, so the
// suggestions have to be in the market's search language, not English.
// No country→language table here: the LLM picks the dominant search
// language itself, which also handles bilingual storefronts (CA, CH, BE...).
function localeInstructions(country: string): string {
  const code = country.toUpperCase();
  const name = COUNTRY_MAP[code] ?? code;
  return `Market: the ${name} (${code}) App Store.
- Write every keyword in the language users in ${name} actually type into App Store search (the dominant local language, in its native script). Use English only where it is the local search language or where locals genuinely search the English term.
- Use local spelling, phrasing, and competitor apps that are popular in ${name}.
- For languages written without spaces (Chinese, Japanese, Thai, etc.), keep each keyword short, as a local user would type it.`;
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

const EMPTY: AISuggestionsResult = { discovery: [], generic: [], branded: [], relevancy: [], longtail: [] };

// GET /api/keywords/ai-suggestions?appName=...&country=us&workspaceId=...&onboarding=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appName     = searchParams.get("appName")     ?? "";
  const description = searchParams.get("description") ?? "";
  const workspaceId = searchParams.get("workspaceId") ?? "";
  const onboarding  = searchParams.get("onboarding") === "1";
  const country     = searchParams.get("country")     || "us";

  if (!appName) return NextResponse.json(EMPTY);

  // AI Suggestions is a Pro feature — anything below that plan never
  // triggers the Gemini LLM pass...
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  let allowed = isPlanAtLeast(planSlug, "pro");

  // ...except the locked first-run wizard (OnboardingWizard.tsx), which gets
  // one free taste of it regardless of plan — the point there is activation,
  // not gating. Restricted to a workspace with zero apps so this can't be
  // replayed as a standing bypass of the paywall after onboarding is done:
  // once the wizard's own keyword save creates the first app, this stops
  // qualifying on every later call, `onboarding=1` or not.
  if (!allowed && onboarding && workspaceId) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("apps")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    allowed = count === 0;
  }

  if (!allowed) return NextResponse.json(EMPTY);

  const [{ discovery: rawDiscovery, longtail: rawLongtail }, rawGeneric, rawBranded, rawRelevancy] = await Promise.all([
    generateDiscoveryAndLongTail(appName, description, 30, country),
    generateKeywords(appName, description, "generic",   30, country),
    generateKeywords(appName, description, "branded",   30, country),
    generateKeywords(appName, description, "relevancy", 30, country),
  ]);

  const [discoveryTerms, genericTerms, brandedTerms, relevancyTerms, longtailTerms] =
    deduplicateAcross(rawDiscovery, rawGeneric, rawBranded, rawRelevancy, rawLongtail);

  return NextResponse.json({
    discovery: discoveryTerms.map((term) => ({ term, volume: 0 })),
    generic:   genericTerms.map((term)   => ({ term, volume: 0 })),
    branded:   brandedTerms.map((term)   => ({ term, volume: 0 })),
    relevancy: relevancyTerms.map((term) => ({ term, volume: 0 })),
    longtail:  longtailTerms.map((term)  => ({ term, volume: 0 })),
  } satisfies AISuggestionsResult);
}
