export const GEMINI_API_KEY     = process.env.GEMINI_API_KEY     ?? "";
export const GEMINI_LLM_MODEL   = process.env.GEMINI_MODEL       ?? "gemini-flash-lite-latest";
export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function geminiHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY };
}

// Serializes all Gemini calls server-wide — carried over from the same
// concurrency cap the self-hosted Ollama setup needed. Gemini enforces its
// own per-minute quota rather than local CPU limits, but serializing still
// smooths bursts (e.g. ai-suggestions' parallel calls) instead of firing
// everything at once and risking a 429.
let geminiChain: Promise<void> = Promise.resolve();

function enqueueGeminiRequest<T>(fn: () => Promise<T>): Promise<T> {
  const result: Promise<T> = geminiChain.then(() => fn());
  geminiChain = result.then(() => undefined, () => undefined);
  return result;
}

// No API key configured → never attempt the network call, so a fresh
// deployment without GEMINI_API_KEY set fails fast and consistently instead
// of an unpredictable 401 per call site.
export async function isGeminiReachable(): Promise<boolean> {
  if (!GEMINI_API_KEY) return false;
  try {
    const res = await enqueueGeminiRequest(() => fetch(`${BASE_URL}/models/${GEMINI_LLM_MODEL}`, {
      headers: geminiHeaders(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateText(prompt: string, temperature = 0): Promise<string | null> {
  try {
    const res = await enqueueGeminiRequest(() => fetch(`${BASE_URL}/models/${GEMINI_LLM_MODEL}:generateContent`, {
      method: "POST",
      headers: geminiHeaders(),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));
    if (!res.ok) return null;
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

export async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await enqueueGeminiRequest(() => fetch(`${BASE_URL}/models/${GEMINI_EMBED_MODEL}:embedContent`, {
      method: "POST",
      headers: geminiHeaders(),
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text }] },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));
    if (!res.ok) return null;
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = (data as any)?.embedding?.values;
    return Array.isArray(values) ? values as number[] : null;
  } catch {
    return null;
  }
}

// Embeds multiple texts in one HTTP round trip via batchEmbedContents, instead
// of one embedContent call per text. Same tokens billed either way — this
// only cuts request count (and the enqueueGeminiRequest queue wait that comes
// with each one), not cost.
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (!texts.length) return [];
  try {
    const res = await enqueueGeminiRequest(() => fetch(`${BASE_URL}/models/${GEMINI_EMBED_MODEL}:batchEmbedContents`, {
      method: "POST",
      headers: geminiHeaders(),
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text }] },
        })),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));
    if (!res.ok) return texts.map(() => null);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const embeddings = (data as any)?.embeddings;
    if (!Array.isArray(embeddings)) return texts.map(() => null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return embeddings.map((e: any) => Array.isArray(e?.values) ? e.values as number[] : null);
  } catch {
    return texts.map(() => null);
  }
}
