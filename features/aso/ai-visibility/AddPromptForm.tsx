"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon, CheckIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { SuggestPromptsResult } from "@/app/api/ai-visibility/suggest-prompts/route";
import type { TrackedPrompt } from "./types";

type Props = {
  activeApp: ActiveApp;
  workspaceId: string;
  appId?: string;
  prompts: TrackedPrompt[];
  onAdded: (appId: string) => void;
};

const VISIBLE_SUGGESTIONS = 5;

function SuggestionPill({
  text, tracked, adding, onClick,
}: { text: string; tracked: boolean; adding: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tracked || adding}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors disabled:cursor-default ${
        tracked
          ? "bg-emerald-500/10 text-emerald-400 light:text-emerald-700"
          : "bg-white/[0.04] light:bg-black/[0.03] text-gray-400 light:text-gray-600 hover:bg-indigo-500/10 hover:text-indigo-300 light:hover:text-indigo-600 disabled:opacity-70"
      }`}
    >
      {tracked ? (
        <CheckIcon className="size-3 shrink-0" />
      ) : adding ? (
        <ArrowPathIcon className="size-3 shrink-0 animate-spin" />
      ) : (
        <PlusIcon className="size-3 shrink-0" />
      )}
      {text}
    </button>
  );
}

export function AddPromptForm({ activeApp, workspaceId, appId, prompts, onAdded }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [placeholder, setPlaceholder] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const trackedSet = useMemo(() => new Set(prompts.map((p) => p.prompt.trim())), [prompts]);

  // One Gemini call gets both a placeholder grounded in what this app
  // actually does and a row of ready-to-tap suggestions — fires as soon as
  // an app becomes active, same "no button needed" convention as Keyword
  // Research's AI-suggested keywords panel.
  useEffect(() => {
    if (!activeApp.name) return;
    setSuggestLoading(true);
    // Clears out whichever app's placeholder/suggestions were showing
    // before this fetch resolves — otherwise switching apps briefly shows
    // the previous app's (now-wrong) placeholder while the new one loads.
    setPlaceholder("");
    setSuggestions([]);
    setShowAllSuggestions(false);
    const params = new URLSearchParams({
      appName: activeApp.name,
      store: activeApp.store,
      storeId: activeApp.store_id ?? "",
      bundleId: activeApp.bundle_id ?? "",
      country: activeApp.country ?? "us",
      workspaceId,
    });
    fetch(`/api/ai-visibility/suggest-prompts?${params}`)
      .then((r) => r.json())
      .then((data: SuggestPromptsResult & { error?: string }) => {
        if (data.placeholder) setPlaceholder(data.placeholder);
        setSuggestions(data.suggestions ?? []);
      })
      .catch(() => {})
      .finally(() => setSuggestLoading(false));
  }, [activeApp.bundle_id, activeApp.store_id, activeApp.store, activeApp.country, activeApp.name, workspaceId]);

  // Shared by the form submit and a suggestion pill tap — saves the prompt,
  // then runs its first check right away (best-effort: a failure here
  // doesn't roll back the track itself, and the row's own Check again
  // button covers the retry — there's no automatic recurring re-check to
  // fall back on).
  async function trackPrompt(promptText: string, onChecking?: () => void): Promise<void> {
    const res = await fetch("/api/ai-visibility/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompts: [promptText],
        workspaceId,
        appId,
        bundleId: activeApp.bundle_id,
        storeId: activeApp.store_id,
        appName: activeApp.name,
        iconUrl: activeApp.icon_url,
        store: activeApp.store,
        country: activeApp.country,
      }),
    });
    const data: { appId?: string; promptIds?: string[]; error?: string } = await res.json();
    if (!res.ok || !data.appId) {
      throw new Error(data.error ?? "Couldn't track this prompt.");
    }

    const promptId = data.promptIds?.[0];
    if (promptId) {
      onChecking?.();
      await fetch("/api/ai-visibility/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: data.appId, promptId, workspaceId }),
      }).catch(() => {});
    }

    onAdded(data.appId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt || saving) return;

    setSaving(true);
    setError(null);
    try {
      setValue("");
      await trackPrompt(prompt, () => setChecking(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't track this prompt.");
    } finally {
      setSaving(false);
      setChecking(false);
    }
  }

  async function handleSuggestionClick(text: string) {
    if (addingSuggestion) return;
    setAddingSuggestion(text);
    setError(null);
    try {
      await trackPrompt(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't track this prompt.");
    } finally {
      setAddingSuggestion(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={suggestLoading ? "Loading suggestions…" : placeholder ? `e.g. "${placeholder}"` : ""}
          maxLength={200}
          className="flex-1 rounded-lg bg-[#1a1d24] light:bg-white border border-white/[0.08] light:border-black/[0.08] px-3 py-2 text-sm text-white light:text-gray-900 placeholder:text-gray-600 light:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        />
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 light:text-indigo-600 ring-1 ring-indigo-500/30 hover:bg-indigo-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <PlusIcon className="size-3.5" />
          {checking ? "Checking…" : saving ? "Adding…" : "Track prompt"}
        </button>
      </form>

      {suggestLoading ? (
        <div className="flex flex-wrap gap-1.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 rounded-md bg-white/[0.04] animate-pulse" style={{ width: `${70 + i * 16}px` }} />
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {(showAllSuggestions ? suggestions : suggestions.slice(0, VISIBLE_SUGGESTIONS)).map((s) => (
            <SuggestionPill
              key={s}
              text={s}
              tracked={trackedSet.has(s.trim())}
              adding={addingSuggestion === s}
              onClick={() => handleSuggestionClick(s)}
            />
          ))}
          {!showAllSuggestions && suggestions.length > VISIBLE_SUGGESTIONS && (
            <button
              type="button"
              onClick={() => setShowAllSuggestions(true)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-indigo-300 light:text-indigo-600 hover:text-indigo-200 light:hover:text-indigo-700 transition-colors"
            >
              Show more ({suggestions.length - VISIBLE_SUGGESTIONS})
            </button>
          )}
        </div>
      ) : null}

      {error && <p className="text-xs text-red-400/80 light:text-red-600">{error}</p>}
    </div>
  );
}
