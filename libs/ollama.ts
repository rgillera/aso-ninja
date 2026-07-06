export const OLLAMA_HOST        = process.env.OLLAMA_HOST        ?? "http://localhost:11434";
export const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "bge-m3";
export const OLLAMA_LLM_MODEL   = process.env.OLLAMA_LLM_MODEL   ?? "llama3.2";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ?? "";

// Local Ollama has no auth in front of it — only attach the key when
// talking to a remote host, so a missing/rotated key never breaks local dev.
const isLocalOllamaHost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(OLLAMA_HOST);

export function ollamaHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocalOllamaHost && OLLAMA_API_KEY) headers["X-API-Key"] = OLLAMA_API_KEY;
  return headers;
}

// Serializes all Ollama calls server-wide so only one generation/embedding
// request runs at a time — the host is CPU-only with no request queueing of
// its own, so concurrent calls (relevancy scoring, embeddings, seed
// expansion) would otherwise all compete for the same CPU and spike load.
// Unlike enqueueAppleRequest, no minimum gap is enforced between calls since
// there's no external rate limit to respect here, just local CPU contention.
let ollamaChain: Promise<void> = Promise.resolve();

export function enqueueOllamaRequest<T>(fn: () => Promise<T>): Promise<T> {
  const result: Promise<T> = ollamaChain.then(() => fn());
  ollamaChain = result.then(() => undefined, () => undefined);
  return result;
}
