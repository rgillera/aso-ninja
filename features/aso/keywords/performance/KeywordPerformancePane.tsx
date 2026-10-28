"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChartBarIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword, DownloadsConnection } from "@/features/aso/keywords/research/types";
import { RankHistoryPanel } from "./RankHistoryPanel";
import { VolumeHistoryPanel } from "./VolumeHistoryPanel";
import { DownloadsHistoryPanel } from "./DownloadsHistoryPanel";
import { unrankedLabel } from "./types";
import { StatStrip } from "@/features/aso/keywords/StatStrip";
import { VisibilityScoreChart, type ChartApp } from "./VisibilityScoreChart";
import type { VisibilityHistoryResult } from "./types";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

// One tracked keyword's performance, for the Performance tab of Keyword
// Research's side pane: today's numbers from its table row, then the same
// rank, volume and downloads history charts Keyword Performance opens as
// modals, stacked inline. `row` is undefined once the keyword is removed
// from the table, which falls back to the empty state.
export function KeywordPerformancePane({
  row, app, downloadsConnection, competitors,
}: {
  row: Keyword | undefined;
  app: ActiveApp;
  downloadsConnection?: DownloadsConnection;
  competitors: CompetitorApp[];
}) {
  const term = row?.keyword;
  // Below Pro, Keyword Performance blurs competitor lines behind an upgrade
  // link; this tab keeps upgrade prompts out, so it's just the app's line.
  const competitorsLocked = !isPlanAtLeast(usePlanSlug(), "pro");
  const chartApps = useMemo<ChartApp[]>(() => {
    const ownId = app.store_id ?? app.id;
    if (!ownId) return [];
    return [
      { id: ownId, name: app.name, icon: app.icon_url ?? "" },
      ...(competitorsLocked ? [] : competitors.map((c) => ({ id: c.storeId, name: c.name, icon: c.icon }))),
    ];
  }, [app.store_id, app.id, app.name, app.icon_url, competitors, competitorsLocked]);

  // Same Search Visibility as Keyword Performance's chart (estimated daily
  // impressions from Volume x Rank), for just this keyword: the last 30
  // days, or since the app was followed if that's later (the same window
  // that chart uses, for the same reason: earlier checks are too sparse).
  const [visibility, setVisibility] = useState<VisibilityHistoryResult>({});
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  const appIds = chartApps.map((a) => a.id).join(",");
  useEffect(() => {
    if (!term || !appIds) return;
    let cancelled = false;
    const today = new Date();
    const from30 = new Date(today); from30.setDate(today.getDate() - 29);
    const last30 = from30.toISOString().split("T")[0];
    const trackedSince = app.created_at?.slice(0, 10);
    const params = new URLSearchParams({
      // Percent-encoded like the Performance page's terms list, so a comma
      // inside the keyword isn't read as a separator.
      terms: encodeURIComponent(term),
      appIds,
      store: app.store,
      country: app.country ?? "us",
      from: trackedSince && trackedSince > last30 ? trackedSince : last30,
      to: today.toISOString().split("T")[0],
    });
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setVisibilityLoading(true);
    fetch(`/api/keywords/visibility-history?${params}`)
      .then((r) => r.json())
      .then((data: VisibilityHistoryResult) => { if (!cancelled) setVisibility(data); })
      .catch(() => { if (!cancelled) setVisibility({}); })
      .finally(() => { if (!cancelled) setVisibilityLoading(false); });
    return () => { cancelled = true; };
  }, [term, appIds, app.store, app.country, app.created_at]);

  if (!row) {
    return (
      <div className="py-16 px-6 text-center">
        <ChartBarIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">Keyword performance</p>
        <p className="mt-1 text-sm text-gray-600 light:text-gray-400 max-w-sm mx-auto">
          Click a keyword in your table to see its rank, volume and downloads over time.
        </p>
      </div>
    );
  }

  const country = (app.country ?? "us").toLowerCase();
  const showDownloads = !!app.id && !!downloadsConnection?.connected;

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-sm font-semibold text-white light:text-gray-900">&ldquo;{row.keyword}&rdquo;</h2>
        <Link
          href="/dashboard/keywords/performance"
          className="flex shrink-0 items-center gap-1 text-xs text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-700 transition-colors"
        >
          All keywords
          <ArrowTopRightOnSquareIcon className="size-3" />
        </Link>
      </div>

      <StatStrip
        columns={3}
        loading={row.loading}
        items={[
          { label: "App rank", value: row.rank === null ? unrankedLabel(app.store) : `#${row.rank}`, muted: row.rank === null },
          { label: "Volume", value: String(row.volume) },
          { label: "Difficulty", value: String(row.diff) },
          { label: "Chance", value: String(row.chance) },
          { label: "Opportunity", value: row.opportunity == null ? "-" : String(row.opportunity) },
          // Same split as Keyword Research's column: an unconnected app has no
          // download data at all, a connected one just none for this keyword.
          !downloadsConnection?.connected
            ? { label: "Est. daily downloads", value: "Not connected", muted: true }
            : { label: "Est. daily downloads", value: row.estimatedDownloads == null ? "-" : DOWNLOADS_FORMATTER.format(row.estimatedDownloads) },
        ]}
      />

      {chartApps.length > 0 && (
        <section className="rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm pb-2">
          <div className="px-4 pt-4">
            <h3 className="text-xs font-medium text-gray-500">Search visibility</h3>
            <p className="mt-0.5 text-[11px] text-gray-600 light:text-gray-400">
              Est. impressions/day from this keyword{chartApps.length > 1 ? ", you vs. your competitors" : ""}
            </p>
          </div>
          <VisibilityScoreChart apps={chartApps} data={visibility} loading={visibilityLoading} />
        </section>
      )}

      {/* Keyed by term: the panels fetch on mount (Downloads only ever
          does), so a new keyword gets fresh ones. */}
      {app.store_id && (
        <RankHistoryPanel key={`rank-${row.keyword}`} inline unranked={!row.loading && row.rank === null} term={row.keyword} storeId={app.store_id} store={app.store} country={country} />
      )}
      <VolumeHistoryPanel key={`volume-${row.keyword}`} inline term={row.keyword} store={app.store} country={country} />
      {showDownloads && app.id && (
        <DownloadsHistoryPanel key={`downloads-${row.keyword}`} inline term={row.keyword} appId={app.id} store={app.store} />
      )}
    </div>
  );
}
