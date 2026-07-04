"use client";

import { useEffect, useState } from "react";
import { InformationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { createClient } from "@/libs/supabase/client";
import { ExplorerFilters } from "./ExplorerFilters";
import { ExplorerTable } from "./ExplorerTable";
import { DEFAULT_FILTERS, type Filters, type ChartApp } from "./types";
import type { MarketExplorerResult } from "@/app/api/market/explorer/route";
import type { MarketStatusMap } from "@/app/api/market/status/route";

export default function AppExplorerPage() {
  const workspaceId = useWorkspaceId();
  const planSlug = usePlanSlug();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [apps, setApps] = useState<ChartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<MarketStatusMap>({});

  useEffect(() => {
    // Locked view below ignores loading/apps/error entirely, so skip the fetch outright.
    if (planSlug !== "enterprise") return;
    setLoading(true);
    setError(null);
    // Apple's chart feed caps at 100 real results, Play's at 200 — both
    // fetched in full up front, so paging through the table is instant and
    // needs no further requests (see ExplorerTable's client-side pagination).
    const params = new URLSearchParams({
      store: filters.store,
      country: filters.country,
      device: filters.device === "all" ? "iphone" : filters.device,
      chart: filters.chart,
      limit: filters.store === "android" ? "200" : "100",
    });
    if (filters.category !== "all") params.set("category", filters.category);

    const controller = new AbortController();
    fetch(`/api/market/explorer?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: MarketExplorerResult & { error?: string }) => {
        if (data.error) { setError(data.error); setApps([]); return; }
        setApps(data.apps ?? []);
      })
      .catch((e) => { if (e.name !== "AbortError") setError("Couldn't load the chart data."); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters.store, filters.country, filters.device, filters.chart, filters.category, planSlug]);

  // Growth team's connected/unconnected status is stored per workspace, keyed
  // by store ID — shared across everyone in the workspace via Postgres (not
  // per-browser). Refetched on focus too, so switching back to this tab picks
  // up a teammate's changes without a full reload.
  useEffect(() => {
    if (!workspaceId || apps.length === 0) return;
    const params = new URLSearchParams({ workspaceId, storeIds: apps.map((a) => a.storeId).join(",") });

    function refresh() {
      fetch(`/api/market/status?${params}`)
        .then((r) => r.json())
        .then((data: { statuses?: MarketStatusMap }) => setConnected((prev) => ({ ...prev, ...data.statuses })))
        .catch(() => {});
    }

    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [workspaceId, apps]);

  // Live updates on top of the focus-refetch above (kept as a fallback in case
  // the websocket drops while backgrounded) — a teammate's toggle shows up
  // immediately instead of waiting for a tab switch. Realtime's
  // postgres_changes still enforces market_app_status's existing RLS policy
  // per subscriber, so this can't leak another workspace's rows.
  useEffect(() => {
    if (!workspaceId || planSlug !== "enterprise") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`market_app_status:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_app_status", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const row = payload.new as { store_id?: string; connected?: boolean } | null;
          if (!row?.store_id) return;
          setConnected((prev) => ({ ...prev, [row.store_id!]: !!row.connected }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  function toggleConnected(storeId: string, store: "ios" | "android") {
    if (!workspaceId) return;
    const next = !connected[storeId];
    setConnected((prev) => ({ ...prev, [storeId]: next }));
    fetch("/api/market/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, storeId, store, connected: next }),
    }).catch(() => setConnected((prev) => ({ ...prev, [storeId]: !next })));
  }

  if (planSlug !== "enterprise") {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <div className="flex items-center gap-2 px-6 pt-6">
          <h1 className="text-xl font-semibold text-white">App Explorer</h1>
        </div>
        <FeatureLocked
          title="Market Intelligence is an Enterprise feature"
          description="App Explorer and the rest of Market Intelligence are available on the Enterprise plan."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <div className="flex items-center gap-2 px-6 pt-6">
        <h1 className="text-xl font-semibold text-white">App Explorer</h1>
        <InformationCircleIcon className="size-4 text-gray-600" title="Ranked from Apple's and Google's public top-charts feeds (capped at 100 and 200 apps respectively — neither store exposes more). No download or revenue figures: neither store discloses those for apps you don't own." />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ExplorerFilters filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} />

        {error ? (
          <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
            <ExclamationTriangleIcon className="size-8 text-amber-500/70 mb-3" />
            <p className="text-sm font-medium text-gray-400">{error}</p>
          </div>
        ) : (
          <ExplorerTable apps={apps} loading={loading} country={filters.country} connected={connected} onToggleConnected={toggleConnected} />
        )}
      </div>
    </div>
  );
}
