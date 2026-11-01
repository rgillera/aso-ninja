"use client";

import { useState, useMemo, useEffect } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { TimelineProps, UpdateEvent, CompetitorTimeline, SelectedUpdate, TimelineRow } from "./types";
import { ALL_FIELDS, DAYS_SHOWN } from "./constants";
import { buildDates, defaultRange, toDateStr } from "./utils";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineToolbar } from "./TimelineToolbar";
import { TimelineGrid } from "./TimelineGrid";
import { BeforeAfterPanel } from "./BeforeAfterPanel";

export default function Timeline({ app }: TimelineProps) {
  const planSlug = usePlanSlug();
  const isLocked = !isPlanAtLeast(planSlug, "pro");
  const { start: defStart, end: defEnd } = defaultRange();

  const [rangeStart, setRangeStart] = useState(defStart);
  const [rangeEnd, setRangeEnd] = useState(defEnd);
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ALL_FIELDS));
  const [selected, setSelected] = useState<SelectedUpdate | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const [events, setEvents] = useState<UpdateEvent[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorTimeline[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset selection when app changes
  useEffect(() => { setSelected(null); }, [app.id]);

  const allDates = useMemo(() => buildDates(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  // Reposition window to end when range changes; drop selection if out of range
  useEffect(() => {
    setDateOffset(Math.max(0, allDates.length - DAYS_SHOWN));
    setSelected(prev => {
      if (!prev) return null;
      return (prev.event.date >= toDateStr(rangeStart) && prev.event.date <= toDateStr(rangeEnd)) ? prev : null;
    });
  }, [allDates.length, rangeStart, rangeEnd]);

  // Fetch real before/after history — recording today's snapshot and diffing
  // it against prior snapshots happens server-side in the API route.
  useEffect(() => {
    if (isLocked) return;
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        appId: app.id,
        workspaceId: app.workspace_id,
        store: app.store,
        country: app.country ?? "US",
        storeId: app.store_id ?? "",
        bundleId: app.bundle_id ?? "",
        from: toDateStr(rangeStart),
        to: toDateStr(rangeEnd),
      });
      fetch(`/api/metadata/timeline?${params}`)
        .then(r => r.json())
        .then((data: { events?: UpdateEvent[]; competitors?: CompetitorTimeline[] }) => {
          setEvents(data.events ?? []);
          setCompetitors(data.competitors ?? []);
        })
        .catch(() => { setEvents([]); setCompetitors([]); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [app.id, app.workspace_id, app.store, app.country, app.store_id, app.bundle_id, rangeStart, rangeEnd, isLocked]);

  const rows = useMemo<TimelineRow[]>(() => {
    const byDate = (list: UpdateEvent[]) => new Map(list.map(e => [e.date, e]));
    return [
      { key: "app", name: app.name, iconUrl: app.icon_url, isCompetitor: false, eventByDate: byDate(events) },
      ...competitors.map(c => ({ key: c.storeId, name: c.name, iconUrl: c.iconUrl, isCompetitor: true, eventByDate: byDate(c.events) })),
    ];
  }, [app.name, app.icon_url, events, competitors]);
  const hasEvents = rows.some(r => r.eventByDate.size > 0);

  function toggleField(f: string) {
    setSelectedFields(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; });
  }

  function handleRangeChange(start: Date, end: Date) {
    setRangeStart(start);
    setRangeEnd(end);
  }

  if (isLocked) {
    return (
      <main className="flex flex-col h-full overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.07] light:border-black/[0.08]">
          {app.icon_url && <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />}
          <p className="text-sm font-semibold text-white light:text-gray-900">{app.name}</p>
        </div>
        <FeatureLocked
          minPlan="pro"
          icon={ClockIcon}
          title="Timeline is a Pro feature"
          description="Upgrade to Pro or above to see your metadata's update history."
          benefits={[
            "See every past title, subtitle, and screenshot change side by side",
            "Compare before & after copy with word-level diffs",
            "Learn what worked by lining updates up with rating shifts",
          ]}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
        <TimelineHeader
          app={app}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={handleRangeChange}
        />

        <TimelineToolbar
          selectedFields={selectedFields}
          onToggle={toggleField}
          onClearAll={() => setSelectedFields(new Set())}
        />

        <TimelineGrid
          rows={rows}
          allDates={allDates}
          dateOffset={dateOffset}
          onOffsetChange={setDateOffset}
          selected={selected}
          onSelect={setSelected}
        />

        {selected ? (
          <BeforeAfterPanel
            event={selected.event}
            appName={selected.rowName}
            selectedFields={selectedFields}
            showDiff={showDiff}
            onShowDiffChange={setShowDiff}
          />
        ) : loading && !hasEvents ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600 light:text-gray-400">Loading update history…</p>
          </div>
        ) : !hasEvents ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600 light:text-gray-400 text-center max-w-sm leading-relaxed">
              No changes in this date range yet. The listing is saved once a day for your app and its competitors, so changes show up from the day after tracking starts.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600 light:text-gray-400">Click a dot to compare before &amp; after</p>
          </div>
        )}
    </main>
  );
}
