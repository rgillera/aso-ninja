"use client";

import { useState, useEffect } from "react";
import { TagIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { IntentBoard } from "./IntentBoard";
import type { IntentTheme, IntentKeyword } from "./types";
import type { SavedKeyword } from "@/app/api/keywords/list/route";

function NoAppSelected() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318]">
      <div className="text-center">
        <TagIcon className="size-10 text-gray-700 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

// Sequential, chunked reclassification of already-tracked keywords after a
// (re)generate — mirrors backfillRelevancy in the Keyword Research page.
// Each term costs a Gemini call, so this is a deliberate bulk action the
// user triggers, not something that runs automatically in the background.
const CLASSIFY_BATCH_SIZE = 5;

type MetricsResponse = Record<string, {
  volume: number; diff: number; chance: number;
  opportunity: number | null; relevancy: number | null; rank: number | null;
  intentThemeId: string | null;
}>;

export default function KeywordIntentPage() {
  const activeApp   = useActiveApp();
  const workspaceId = useWorkspaceId();
  const planSlug    = usePlanSlug();
  const isLocked    = !isPlanAtLeast(planSlug, "pro_plus");

  const [themes, setThemes]   = useState<IntentTheme[]>([]);
  const [keywords, setKeywords] = useState<IntentKeyword[]>([]);
  const [resolvedAppId, setResolvedAppId] = useState<string | null>(null);
  // Key of the app whose data is currently in `themes`/`keywords` — compared
  // against the active app below rather than a plain loading boolean, so the
  // load effect never needs to setState synchronously on entry.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const currentKey = activeApp?.id ?? activeApp?.bundle_id ?? null;
  const loaded = loadedKey !== null && loadedKey === currentKey;
  const [generating, setGenerating] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  function identityParams(): Record<string, string> | null {
    if (activeApp?.id) return { appId: activeApp.id };
    if (workspaceId && activeApp?.bundle_id && activeApp?.store) {
      return { workspaceId, bundleId: activeApp.bundle_id, store: activeApp.store, country: activeApp.country ?? "us" };
    }
    return null;
  }

  // Load this app's intent themes + tracked keywords together.
  useEffect(() => {
    if (!activeApp || isLocked) return;
    const params = identityParams();
    if (!params) return;
    const key = activeApp.id ?? activeApp.bundle_id ?? null;

    Promise.all([
      fetch(`/api/keywords/intents?${new URLSearchParams(params)}`).then((r) => r.json()),
      fetch(`/api/keywords/list?${new URLSearchParams(params)}`).then((r) => r.json()),
    ])
      .then(([intentsData, listData]: [{ themes: IntentTheme[]; appId: string | null }, { keywords: SavedKeyword[] }]) => {
        setThemes(intentsData.themes ?? []);
        setResolvedAppId(intentsData.appId ?? null);
        setKeywords(
          (listData.keywords ?? []).map((k) => ({
            term: k.term,
            volume: k.volume,
            relevancy: k.relevancy,
            intentThemeId: k.intentThemeId,
          }))
        );
        setLoadedKey(key);
      })
      .catch(() => setLoadedKey(key));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id, activeApp?.store, workspaceId, isLocked]);

  async function classifyAll(appId: string) {
    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";
    const terms   = keywords.map((k) => k.term);
    if (!terms.length) return;

    setClassifyProgress({ done: 0, total: terms.length });
    for (let i = 0; i < terms.length; i += CLASSIFY_BATCH_SIZE) {
      const batch = terms.slice(i, i + CLASSIFY_BATCH_SIZE);
      const params = new URLSearchParams({
        terms: batch.join(","),
        store,
        country,
        appName: activeApp?.name ?? "",
        appId,
        forceIntent: "1",
        ...(workspaceId ? { workspaceId } : {}),
      });

      try {
        const res  = await fetch(`/api/keywords/metrics?${params}`);
        const data: MetricsResponse = await res.json();

        setKeywords((prev) =>
          prev.map((k) => {
            const m = data[k.term];
            return m && batch.includes(k.term)
              ? { ...k, relevancy: m.relevancy, intentThemeId: m.intentThemeId }
              : k;
          })
        );

        if (workspaceId) {
          await fetch("/api/keywords/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              terms: batch,
              workspaceId,
              metrics: data,
              appId,
              appName: activeApp?.name,
              store,
              country,
            }),
          });
        }
      } catch {
        // A transient failure on one batch shouldn't strand the rest.
      }
      setClassifyProgress({ done: Math.min(i + CLASSIFY_BATCH_SIZE, terms.length), total: terms.length });
    }
    setClassifyProgress(null);
  }

  async function handleGenerate() {
    if (!activeApp || generating) return;
    setGenerating(true);
    setError(null);
    try {
      let description = "";
      if (activeApp.store_id) {
        try {
          const res = await fetch(
            `/api/keywords/app-metadata?storeId=${activeApp.store_id}&store=${activeApp.store}&country=${activeApp.country ?? "us"}`
          );
          const meta: { description?: string } = await res.json();
          description = meta?.description ?? "";
        } catch {
          // Fall through with an empty description — the LLM still has appName to work with.
        }
      }

      const res = await fetch("/api/keywords/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: activeApp.id,
          workspaceId,
          appName: activeApp.name,
          description,
          bundleId: activeApp.bundle_id,
          store: activeApp.store,
          country: activeApp.country ?? "us",
        }),
      });
      const data: { themes?: IntentTheme[]; appId?: string; error?: string } = await res.json();
      if (!res.ok || !data.themes) {
        setError(data.error ?? "Couldn't generate intent themes.");
        return;
      }

      setThemes(data.themes);
      const appId = data.appId ?? resolvedAppId;
      if (appId) {
        setResolvedAppId(appId);
        await classifyAll(appId);
      }
    } catch {
      setError("Couldn't generate intent themes.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddIntent(label: string): Promise<string | null> {
    if (!activeApp) return "No app selected.";
    const params = identityParams();
    if (!params) return "App not found.";

    try {
      const res = await fetch("/api/keywords/intents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, workspaceId, label }),
      });
      const data: { themes?: IntentTheme[]; appId?: string; error?: string } = await res.json();
      if (!res.ok || !data.themes) return data.error ?? "Couldn't add this intent.";

      setThemes(data.themes);
      if (data.appId) setResolvedAppId(data.appId);
      return null;
    } catch {
      return "Couldn't add this intent.";
    }
  }

  function handleMove(terms: string[], themeId: string | null) {
    if (!terms.length) return;
    const termSet = new Set(terms);
    setKeywords((prev) => prev.map((k) => (termSet.has(k.term) ? { ...k, intentThemeId: themeId } : k)));
    if (!resolvedAppId || !workspaceId) return;
    fetch("/api/keywords/intents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: resolvedAppId, workspaceId, terms, themeId }),
    }).catch(() => {});
  }

  async function handleEditIntent(
    themeId: string,
    updates: { label?: string; colorIndex?: number | null }
  ): Promise<string | null> {
    if (!resolvedAppId || !workspaceId) return "App not found.";

    try {
      const res = await fetch("/api/keywords/intents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: resolvedAppId, workspaceId, themeId, ...updates }),
      });
      const data: { themes?: IntentTheme[]; appId?: string; error?: string } = await res.json();
      if (!res.ok || !data.themes) return data.error ?? "Couldn't update this intent.";

      setThemes(data.themes);
      return null;
    } catch {
      return "Couldn't update this intent.";
    }
  }

  async function handleDeleteIntent(themeId: string) {
    const params = identityParams();
    if (!params) return;

    try {
      const res = await fetch("/api/keywords/intents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, workspaceId, themeId }),
      });
      const data: { themes?: IntentTheme[]; appId?: string; error?: string } = await res.json();
      if (!res.ok || !data.themes) {
        setError(data.error ?? "Couldn't delete this intent.");
        return;
      }

      setThemes(data.themes);
      setKeywords((prev) => prev.map((k) => (k.intentThemeId === themeId ? { ...k, intentThemeId: null } : k)));
    } catch {
      setError("Couldn't delete this intent.");
    }
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Group by Intent" />
        <FeatureLocked
          minPlan="pro_plus"
          icon={TagIcon}
          title="Group by Intent is a Pro+ feature"
          description="Upgrade to Pro+ or above to cluster your tracked keywords by search intent."
          benefits={[
            "Auto-generate a feature-specific intent taxonomy for your app",
            "Every tracked keyword classified automatically — no manual tagging",
            "Copy each intent group straight into an Apple Search Ads campaign",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="Group by Intent" />

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1"><PlanLimitMessage message={error} /></span>
          <button onClick={() => setError(null)} className="shrink-0 hover:text-red-300">
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <IntentBoard
          themes={themes}
          keywords={keywords}
          loaded={loaded}
          generating={generating}
          classifyProgress={classifyProgress}
          onGenerate={handleGenerate}
          onMove={handleMove}
          onAddIntent={handleAddIntent}
          onEditIntent={handleEditIntent}
          onDeleteIntent={handleDeleteIntent}
        />
      </div>
    </div>
  );
}
