import { NextRequest, NextResponse } from "next/server";

const OLLAMA_HOST      = process.env.OLLAMA_HOST      ?? "http://localhost:11434";
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "llama3.2";
const OLLAMA_API_KEY   = process.env.OLLAMA_API_KEY    ?? "";

// Terms are keyword fragments, not sentences, and never change meaning between
// apps — cache process-wide so re-toggling translation (or another user
// looking at the same foreign-language app) doesn't re-hit the LLM.
const translationCache = new Map<string, string>();

// Purely numeric/punctuation terms (e.g. "24", "3.0") can't be translated —
// everything else is routed through the LLM. Scripts alone can't tell us the
// term's language (plain Latin letters could be English, Indonesian,
// Vietnamese without diacritics, etc.), so the model itself — not this route —
// decides whether a term is already English.
const isTranslatable = (term: string) => /[\p{L}]/u.test(term);

async function translateBatch(terms: string[]): Promise<Record<string, string>> {
  const prompt = `Translate each of the following App Store search keywords to English, whatever language they're written in. If a keyword is already English, output it unchanged. Keep translations short (1-4 words), matching the register of ASO keywords, not full sentences.

Reply with ONLY a JSON array of strings, same length and order as the input, no explanation:
${JSON.stringify(terms)}`;

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": OLLAMA_API_KEY },
    body: JSON.stringify({ model: OLLAMA_LLM_MODEL, prompt, stream: false, options: { temperature: 0 } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (!res.ok) return {};

  const data = await res.json();
  const raw = ((data.response ?? "") as string).trim();
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return {};

  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    terms.forEach((term, i) => {
      const translated = parsed[i];
      if (typeof translated === "string" && translated.trim()) out[term] = translated.trim();
    });
    return out;
  } catch {
    return {};
  }
}

// POST /api/keywords/translate  { terms: string[] }  →  { translations: Record<string,string> }
export async function POST(request: NextRequest) {
  const body: { terms?: string[] } = await request.json().catch(() => ({}));
  const terms = [...new Set((body.terms ?? []).filter(Boolean))];
  if (!terms.length) return NextResponse.json({ translations: {} });

  const translations: Record<string, string> = {};
  const toFetch: string[] = [];

  for (const term of terms) {
    if (!isTranslatable(term)) { translations[term] = term; continue; }
    const cached = translationCache.get(term);
    if (cached) translations[term] = cached;
    else toFetch.push(term);
  }

  if (toFetch.length) {
    try {
      const fresh = await translateBatch(toFetch);
      for (const [term, translated] of Object.entries(fresh)) {
        translationCache.set(term, translated);
        translations[term] = translated;
      }
    } catch {
      // Best-effort — terms without a translation are simply omitted, and the
      // UI falls back to showing the original term.
    }
  }

  return NextResponse.json({ translations });
}
