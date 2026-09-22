"use client";

import { useState } from "react";
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { TrackedPrompt, TrackedPromptLatest } from "./types";

type Props = {
  appId: string;
  workspaceId: string;
  prompt: TrackedPrompt;
  onChecked: () => void;
  onRemoved: (promptId: string) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function PromptRow({ appId, workspaceId, prompt, onChecked, onRemoved }: Props) {
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-visibility/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, promptId: prompt.promptId, workspaceId }),
      });
      const data: { latest?: TrackedPromptLatest; error?: string } = await res.json();
      if (!res.ok || !data.latest) {
        setError(data.error ?? "Couldn't check this prompt.");
        return;
      }
      onChecked();
    } catch {
      setError("Couldn't check this prompt.");
    } finally {
      setChecking(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await fetch("/api/ai-visibility/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, promptIds: [prompt.promptId] }),
      });
      onRemoved(prompt.promptId);
    } catch {
      setRemoving(false);
    }
  }

  const { latest } = prompt;

  return (
    <div className="rounded-xl bg-[#1a1d24] light:bg-white px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-200 light:text-gray-800 truncate">&ldquo;{prompt.prompt}&rdquo;</p>
          {latest ? (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {latest.mentioned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 light:text-emerald-700">
                  <CheckCircleIcon className="size-3" />
                  Mentioned{latest.position ? ` · #${latest.position}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 light:bg-black/[0.04] px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  <XCircleIcon className="size-3" />
                  Not mentioned
                </span>
              )}
              <span className="text-[11px] text-gray-600 light:text-gray-400">{formatDate(latest.checkedOn)}</span>
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] text-gray-600 light:text-gray-400">Not checked yet</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCheck}
            disabled={checking}
            title="Check again"
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-gray-400 light:text-gray-600 hover:bg-white/[0.10] light:hover:bg-black/[0.08] hover:text-white light:hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`size-3 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check again"}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            title="Stop tracking"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <TrashIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {latest?.snippet && (
        <p className="text-xs text-gray-500 light:text-gray-500 leading-relaxed">{latest.snippet}</p>
      )}

      {latest && latest.competitorApps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {latest.competitorApps.slice(0, 6).map((c) => (
            <span
              key={c.name}
              className="rounded-full bg-white/[0.04] light:bg-black/[0.03] px-2 py-0.5 text-[10px] text-gray-500 light:text-gray-500"
            >
              #{c.position} {c.name}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-red-400/80 light:text-red-600">{error}</p>}
    </div>
  );
}
