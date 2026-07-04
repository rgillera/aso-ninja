import { SUFFIX_MODIFIERS, PREFIX_MODIFIERS } from "./keywordModifiers";

const OLLAMA_HOST      = process.env.OLLAMA_HOST      ?? "http://localhost:11434";
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "llama3.2";

// SUFFIX_MODIFIERS/PREFIX_MODIFIERS are English words — appending them to a
// non-English seed would produce mixed-language phrases (e.g. "entrenamiento
// tracker"), which is exactly what the LLM prompt above is trying to avoid.
// This fallback only runs when Ollama is unreachable, so for a seed that
// isn't plain ASCII (covers accented/non-Latin scripts — the common case for
// non-English keywords here) it's safer to return nothing than to guess
// wrong-language filler.
function isLikelyNonEnglish(seed: string): boolean {
  return /[^\x00-\x7F]/.test(seed);
}

function ruleBasedCombinations(seed: string, count: number): string[] {
  if (isLikelyNonEnglish(seed)) return [];
  const results = [
    ...SUFFIX_MODIFIERS.map((m) => `${seed} ${m}`),
    ...PREFIX_MODIFIERS.map((m) => `${m} ${seed}`),
  ].filter((p, i, arr) => arr.indexOf(p) === i);
  return results.slice(0, count);
}

export async function generateCombinations(
  seed: string,
  count: number,
  appName: string,
  appSubtitle: string,
): Promise<string[]> {
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
- Write every phrase entirely in the same language as "${seed}" — if "${seed}" is not English, do not translate it and do not mix in English (or any other language) words. Every word you add around it must be in that same language.
- 2-4 words total per phrase
- Lowercase, no punctuation
- No duplicates
- No generic filler like "for beginners" or "online" unless it genuinely fits this app

Reply with ONLY a JSON array of strings. The example below is for JSON formatting only — match its structure, not its language: ["${seed} tracker","pet ${seed}"]`;

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
    if (!res.ok) return ruleBasedCombinations(seed, count);
    const data = await res.json();
    const raw = (data.response ?? "") as string;
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return ruleBasedCombinations(seed, count);
    const parsed = JSON.parse(match[0]) as unknown[];
    const seedLower = seed.toLowerCase();
    const llmResults = [...new Set(
      parsed
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.includes(seedLower) && k.length >= seed.length && k.length <= 50)
    )].slice(0, count);
    return llmResults.length > 0 ? llmResults : ruleBasedCombinations(seed, count);
  } catch { return ruleBasedCombinations(seed, count); }
}
