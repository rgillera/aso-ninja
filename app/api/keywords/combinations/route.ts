import { NextRequest, NextResponse } from "next/server";

const OLLAMA_HOST      = process.env.OLLAMA_HOST      ?? "http://localhost:11434";
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "llama3.2";

export type CombinationChild = { term: string; volume: number; results: number };
export type CombinationGroup = { seed: string; children: CombinationChild[] };
export type CombinationsResult = { groups: CombinationGroup[] };

const EMPTY: CombinationsResult = { groups: [] };

async function generateCombinations(seed: string, count: number, appName: string, appSubtitle: string): Promise<string[]> {
  const contextLines: string[] = [];
  if (appName)     contextLines.push(`App name: "${appName}"`);
  if (appSubtitle) contextLines.push(`App subtitle/short description: "${appSubtitle}"`);
  const appContext = contextLines.length
    ? `Context about the app:\n${contextLines.join("\n")}\n\nOnly suggest combinations relevant to what this app does and the users it serves.`
    : "";

  const prompt = `You are an App Store Optimization expert. Generate ${count} realistic App Store search phrases that each contain the exact word or phrase "${seed}".

${appContext}

Think about the specific niche and users of this app. Combine "${seed}" with words that users of THIS app would actually search for — related topics, tasks, problems, or features specific to its domain.

Rules:
- Each phrase MUST include "${seed}" as a substring
- 2-4 words total per phrase
- Lowercase, no punctuation
- No duplicates
- No generic filler like "for beginners" or "online" unless it genuinely fits this app

Reply with ONLY a JSON array of strings. Example: ["${seed} tracker","pet ${seed}"]`;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_LLM_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.5 },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (!res.ok) return [];
    const data = await res.json();
    const raw = (data.response ?? "") as string;
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as unknown[];
    const seedLower = seed.toLowerCase();
    return [...new Set(
      parsed
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.includes(seedLower) && k.length >= seed.length && k.length <= 50)
    )].slice(0, count);
  } catch { return []; }
}

async function fetchVolumeAndResults(term: string, country: string): Promise<CombinationChild> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=50&country=${country}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await fetch(url, { cache: "no-store" } as any);
    if (!res.ok) return { term, volume: 0, results: 0 };
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = data.results ?? [];
    const resultCount: number = data.resultCount ?? apps.length;
    const kwTokens = term.toLowerCase().split(/\s+/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleApps = apps.filter((a: any) => kwTokens.every((w) => (a.trackName ?? "").toLowerCase().includes(w)));
    const avgRatings = titleApps.length === 0 ? 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : titleApps.reduce((s: number, a: any) => s + (a.userRatingCount ?? 0), 0) / titleApps.length;
    const volume = avgRatings < 1_000 ? 5
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(10_000_000)) * 100), 100);
    return { term, volume, results: resultCount };
  } catch { return { term, volume: 0, results: 0 }; }
}

// GET /api/keywords/combinations?seeds=fitness,boxing&country=us&perSeed=8
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seedsParam = searchParams.get("seeds") ?? "";
  const country     = (searchParams.get("country") ?? "us").toLowerCase();
  const perSeed     = Math.min(Math.max(parseInt(searchParams.get("perSeed") ?? "8", 10), 1), 20);

  const appName     = searchParams.get("appName") ?? "";
  const appSubtitle = searchParams.get("appSubtitle") ?? "";
  const seeds = [...new Set(seedsParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (!seeds.length) return NextResponse.json(EMPTY);

  const groups: CombinationGroup[] = await Promise.all(
    seeds.map(async (seed) => {
      const phrases = await generateCombinations(seed, perSeed, appName, appSubtitle);
      const children = await Promise.all(phrases.map((term) => fetchVolumeAndResults(term, country)));
      children.sort((a, b) => b.volume - a.volume);
      return { seed, children };
    })
  );

  return NextResponse.json({ groups } satisfies CombinationsResult);
}
