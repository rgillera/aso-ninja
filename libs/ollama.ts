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
