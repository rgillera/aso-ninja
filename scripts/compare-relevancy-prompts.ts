// One-off: scores the same keywords with the legacy relevancy prompt (which
// credited keywords for matching the app name/subtitle) and the current one
// (libs/keyword-relevancy.ts getDescRelevanceScore, which judges search intent
// only), so the change can be checked before existing scores are re-done.
//
// Only the LLM part of relevancy is compared; it is 70% of the final score
// (see computeRelevancy), and the 30% embedding part didn't change.
//
// Read-only: no database access, no writes. Hits the iTunes search API and
// the store page once per app, plus two Gemini calls per keyword.
//
// Input is a JSON file:
//   [
//     { "app": "NutriSnap: Calorie Counter", "country": "us",
//       "keywords": ["calorie counter", "food diary", "macro tracker", "meal planner", "myfitnesspal"] }
//   ]
// "app" is matched the same way the app does (exact → starts-with → contains).
// Pick a mix per app: keywords in the title/subtitle, good fits that aren't,
// and loose/unrelated ones.
//
// Usage:
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json \
//     scripts/compare-relevancy-prompts.ts path/to/input.json

import { readFileSync } from "node:fs";
import { generateText } from "../libs/gemini";
import { fetchIosAppMeta, getDescRelevanceScore, findSubstringCollisions, wordTokens } from "../libs/keyword-relevancy";

type Input = { app: string; country?: string; keywords: string[] }[];

// Verbatim copy of the prompt before the change (no intent themes, so the
// single-integer reply format), kept here only for this comparison.
function legacyPrompt(keyword: string, appName: string, appSubtitle: string, description: string): string {
  const context = [appName, appSubtitle, description].filter(Boolean).join(". ");
  const collisions = findSubstringCollisions(keyword, context);
  const collisionSection = collisions.length
    ? `\n\nNote: in this app's listing, ${collisions.map((c) => `"${c.word}" only appears inside ${c.hosts.map((h) => `"${h}"`).join("/")}, never on its own`).join("; ")}. Don't count that fragment alone as evidence of relevance — judge those word(s) on their actual real-world meaning.\n`
    : "";
  return `You are an ASO expert scoring keyword intent. A user typed this keyword in the App Store search bar. Score the probability (0-100) that they are specifically looking for THIS app.

App name: "${appName}"
App subtitle: "${appSubtitle || "(none)"}"
App description: "${description}"
Keyword: "${keyword}"
${collisionSection}
Rules — apply in order, stop at first match. The app name and subtitle are the strongest signal — a keyword that directly matches wording in the name or subtitle should score at least as high as one that only matches the description:
1. If the keyword is another app's brand name or company name → score 0-10. The user wants that specific product, not this one.
2. If the keyword describes a completely unrelated category (e.g. "baby tracker", "pet care", "ride sharing" for a nutrition app) → score 0-15.
3. If the keyword is loosely related but this app is unlikely to satisfy the search intent → score 16-40.
4. If the keyword is a secondary use case this app genuinely supports → score 41-60.
5. If the keyword directly describes a core feature of this app → score 61-80.
6. If the keyword is exactly what this app is built for, or closely matches its name/subtitle → score 81-100.

Critical: score USER INTENT, not category overlap. Two apps in the same category can still have very different intents (e.g. "myfitnesspal" typed by someone who wants MyFitnessPal specifically = score 5 for any other app).

Reply with ONLY a single integer. No explanation, no punctuation, just the number.`;
}

async function legacyScore(keyword: string, appName: string, subtitle: string, description: string): Promise<number | null> {
  const raw = await generateText(legacyPrompt(keyword, appName, subtitle, description), 0);
  const num = parseInt(raw?.match(/\d+/)?.[0] ?? "", 10);
  return isNaN(num) ? null : Math.max(0, Math.min(100, num));
}

// Every keyword word appears as a whole word in the name or subtitle. Any
// single shared word is too loose: "sleep tracker" isn't in "Nutrition Tracker".
function inMetadata(keyword: string, appName: string, subtitle: string): boolean {
  const meta = new Set(wordTokens(`${appName} ${subtitle}`));
  return wordTokens(keyword).every((w) => meta.has(w));
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fmt = (n: number) => (isNaN(n) ? "  -" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}`);

async function main() {
  const path = process.argv[2];
  if (!path) { console.error("Usage: compare-relevancy-prompts.ts <input.json>"); process.exit(1); }
  if (!process.env.GEMINI_API_KEY) { console.error("GEMINI_API_KEY is not set (pass --env-file=.env.local)"); process.exit(1); }
  const input = JSON.parse(readFileSync(path, "utf8")) as Input;

  const deltas = { inMeta: [] as number[], notInMeta: [] as number[] };

  for (const { app, country = "us", keywords } of input) {
    const meta = await fetchIosAppMeta(app, country, false);
    console.log(`\n=== ${app} (${country}) ===`);
    console.log(`subtitle: ${meta.subtitle || "(none)"}`);
    if (!meta.description) console.log("WARNING: app not found or no description; scores will be weak");

    const rows = await Promise.all(keywords.map(async (kw) => {
      const [oldScore, current] = await Promise.all([
        legacyScore(kw, app, meta.subtitle, meta.description),
        getDescRelevanceScore(kw, app, meta.subtitle, meta.description, []),
      ]);
      return { kw, inMeta: inMetadata(kw, app, meta.subtitle), oldScore, newScore: current.score };
    }));

    console.log(`${"keyword".padEnd(32)} ${"in title".padEnd(8)}  old  new  delta`);
    for (const r of rows) {
      const delta = r.oldScore === null ? NaN : r.newScore - r.oldScore;
      if (!isNaN(delta)) (r.inMeta ? deltas.inMeta : deltas.notInMeta).push(delta);
      console.log(`${r.kw.slice(0, 32).padEnd(32)} ${(r.inMeta ? "yes" : "").padEnd(8)} ${String(r.oldScore ?? "ERR").padStart(4)} ${String(r.newScore).padStart(4)}  ${fmt(delta)}`);
    }
  }

  console.log("\n=== Summary (LLM score; final relevancy moves by 70% of this) ===");
  console.log(`in title/subtitle:     n=${deltas.inMeta.length}  avg delta ${fmt(avg(deltas.inMeta))}`);
  console.log(`not in title/subtitle: n=${deltas.notInMeta.length}  avg delta ${fmt(avg(deltas.notInMeta))}`);
  console.log("Hoped for: not-in-title fits rise, in-title barely moves, unrelated/competitor brands stay low.");
}

main().catch((e) => { console.error(e); process.exit(1); });
