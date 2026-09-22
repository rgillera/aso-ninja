"use client";

import { useEffect, useState } from "react";
import {
  SparklesIcon, MagnifyingGlassIcon, InformationCircleIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { AddPromptForm } from "./AddPromptForm";
import { PromptRow } from "./PromptRow";
import { VisibilityTrendChart } from "./VisibilityTrendChart";
import type { TrackedPrompt, AiVisibilityHistoryPoint, AiVisibilityListResult } from "./types";

function NoAppSelected() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318] light:bg-[#f5f6f8]">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600 light:text-gray-400">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function AiVisibilityPage() {
  const activeApp = useActiveApp();
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const isLocked = !isPlanAtLeast(planSlug, "pro_plus");

  // Tracks whichever internal apps.id this app currently resolves to — starts
  // as activeApp?.id, but a previewed-but-not-yet-followed app has none until
  // the first tracked prompt is saved (that save silently creates the apps
  // row, same as /api/keywords/save), so it's kept in state rather than read
  // directly off activeApp on every call. Mirrors the competitorsAppId
  // pattern in features/aso/keywords/research/index.tsx.
  const [appId, setAppId] = useState<string | undefined>(activeApp?.id);
  // Tracks which app's id was last synced into `appId`, so a prop change
  // (switching apps) can be told apart from a same-app resolution written
  // by handleAdded — the render-time "adjust state from a prop" pattern
  // (see react.dev/learn/you-might-not-need-an-effect) rather than a
  // setState call inside the effect below.
  const [syncedAppId, setSyncedAppId] = useState<string | undefined>(activeApp?.id);
  const [prompts, setPrompts] = useState<TrackedPrompt[]>([]);
  const [history, setHistory] = useState<AiVisibilityHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  if (activeApp?.id !== syncedAppId) {
    setSyncedAppId(activeApp?.id);
    setAppId(activeApp?.id);
    setPage(0);
  }

  // Newest-first order comes straight from /api/ai-visibility/list, so page
  // 0 is always "most recently tracked" — no client-side sort needed here.
  // currentPage clamps down on its own if `prompts` shrinks below the page
  // the user was on (e.g. after removing the last prompt on a later page),
  // rather than needing a separate reset effect.
  const pageCount = Math.max(1, Math.ceil(prompts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagePrompts = prompts.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function loadList(id: string | undefined) {
    if (!id) {
      setPrompts([]);
      setHistory([]);
      return;
    }
    setLoading(true);
    fetch(`/api/ai-visibility/list?appId=${id}`)
      .then((r) => r.json())
      .then((data: AiVisibilityListResult) => {
        setPrompts(data.prompts ?? []);
        setHistory(data.history ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Re-fetches whenever the active app changes (switching apps via search,
  // or navigating here fresh).
  useEffect(() => {
    if (isLocked) return;
    loadList(activeApp?.id);
  }, [activeApp?.id, isLocked]);

  function handleAdded(newAppId: string) {
    setAppId(newAppId);
    loadList(newAppId);
  }

  // A "Check again" mutates both this prompt's latest status and (possibly)
  // today's history point — simplest to treat the server as the source of
  // truth and reload both rather than hand-roll the same aggregation
  // /api/ai-visibility/list already does.
  function handleChecked() {
    loadList(appId);
  }

  function handleRemoved(promptId: string) {
    setPrompts((prev) => prev.filter((p) => p.promptId !== promptId));
  }

  if (!activeApp) return <NoAppSelected />;

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
        <AppHeader app={activeApp} title="AI Visibility" />
        <FeatureLocked
          minPlan="pro_plus"
          icon={SparklesIcon}
          title="AI Visibility is a Pro+ feature"
          description="Track how your app surfaces when people ask AI assistants for app recommendations."
          benefits={[
            "See whether your app gets mentioned for the discovery prompts that matter to you",
            "Track your position and which competitors show up alongside you, over time",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
      <AppHeader app={activeApp} title="AI Visibility" />

      <div className="flex items-center gap-1.5 px-6 pt-3 text-xs text-gray-500 light:text-gray-500">
        <InformationCircleIcon className="size-3.5 shrink-0" />
        <span>
          Simulated as a stand-in for AI-powered discovery.{" "}
          <a
            href="/dashboard/learn?topic=ai-visibility"
            className="text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-700 underline underline-offset-2"
          >
            Learn how to improve your AI visibility
          </a>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="rounded-xl bg-[#1a1d24] light:bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Track a discovery prompt
          </p>
          <AddPromptForm activeApp={activeApp} workspaceId={workspaceId} appId={appId} prompts={prompts} onAdded={handleAdded} />
        </div>

        <div className="rounded-xl bg-[#1a1d24] light:bg-white overflow-hidden shadow-lg shadow-black/20 light:shadow-black/10">
          <VisibilityTrendChart history={history} loading={loading} />
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-gray-500">
              Loading tracked prompts…
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6 rounded-xl bg-[#1a1d24] light:bg-white">
              <SparklesIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400 light:text-gray-600">No prompts tracked yet</p>
              <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
                Add a question a real user might ask an AI assistant when looking for an app like yours.
              </p>
            </div>
          ) : (
            <>
              {appId && pagePrompts.map((p) => (
                <PromptRow
                  key={p.promptId}
                  appId={appId}
                  workspaceId={workspaceId}
                  prompt={p}
                  onChecked={handleChecked}
                  onRemoved={handleRemoved}
                />
              ))}
              {pageCount > 1 && (
                <div className="flex items-center justify-between px-1 pt-1">
                  <p className="text-xs text-gray-600 light:text-gray-400">
                    Page {currentPage + 1} of {pageCount} &middot; {prompts.length.toLocaleString()} prompt{prompts.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(0)}
                      disabled={currentPage === 0}
                      className="p-1 text-gray-500 hover:text-white light:hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <ChevronDoubleLeftIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="p-1 text-gray-500 hover:text-white light:hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <ChevronLeftIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={currentPage >= pageCount - 1}
                      className="p-1 text-gray-500 hover:text-white light:hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <ChevronRightIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setPage(pageCount - 1)}
                      disabled={currentPage >= pageCount - 1}
                      className="p-1 text-gray-500 hover:text-white light:hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <ChevronDoubleRightIcon className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
