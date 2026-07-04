"use client";

import { useState, useMemo, useEffect } from "react";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { TimelineProps, UpdateEvent, ScreenshotItem } from "./types";
import { ALL_FIELDS, EVENT_TEMPLATES, DAYS_SHOWN } from "./constants";
import { buildDates, defaultRange, toDateStr } from "./utils";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineToolbar } from "./TimelineToolbar";
import { TimelineGrid } from "./TimelineGrid";
import { BeforeAfterPanel } from "./BeforeAfterPanel";

export default function Timeline({ app, screenshots = [] }: TimelineProps) {
  const planSlug = usePlanSlug();
  const isLocked = !isPlanAtLeast(planSlug, "pro");
  const { start: defStart, end: defEnd } = defaultRange();

  const [rangeStart, setRangeStart]       = useState(defStart);
  const [rangeEnd,   setRangeEnd]         = useState(defEnd);
  const [dateOffset, setDateOffset]       = useState(0);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ALL_FIELDS));
  const [selectedEvent, setSelectedEvent] = useState<UpdateEvent | null>(null);
  const [showDiff, setShowDiff]           = useState(true);

  // Reset selection when app changes
  useEffect(() => { setSelectedEvent(null); }, [app.id]);

  const allDates = useMemo(() => buildDates(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  // Reposition window to end when range changes; drop selection if out of range
  useEffect(() => {
    setDateOffset(Math.max(0, allDates.length - DAYS_SHOWN));
    setSelectedEvent(prev => {
      if (!prev) return null;
      return (prev.date >= toDateStr(rangeStart) && prev.date <= toDateStr(rangeEnd)) ? prev : null;
    });
  }, [allDates.length, rangeStart, rangeEnd]);

  // Build app-specific events, injecting real screenshot URLs
  const appEvents = useMemo<UpdateEvent[]>(() => {
    const slug = (app.name ?? "app").toLowerCase().replace(/[^a-z0-9]/g, "-");

    const afterCount  = screenshots.length;
    const beforeCount = Math.max(1, afterCount - 2);

    const screenshotsBefore: ScreenshotItem[] = screenshots
      .slice(0, beforeCount)
      .map(url => ({ status: "repositioned" as const, url }));

    const screenshotsAfter: ScreenshotItem[] = [
      ...screenshots.slice(0, beforeCount).map(url => ({ status: "repositioned" as const, url })),
      ...screenshots.slice(beforeCount).map(url => ({ status: "added" as const, url })),
    ];

    return EVENT_TEMPLATES.map(e => ({
      ...e,
      fields: e.fields.map(f => {
        const base = {
          ...f,
          before: f.before.replace(/\{\{app\}\}/g, app.name).replace(/\{\{slug\}\}/g, slug),
          after:  f.after.replace(/\{\{app\}\}/g, app.name).replace(/\{\{slug\}\}/g, slug),
        };
        if (f.field !== "Screenshots") return base;
        return {
          ...base,
          before: `${beforeCount} screenshot${beforeCount !== 1 ? "s" : ""}`,
          after:  `${afterCount} screenshot${afterCount !== 1 ? "s" : ""}`,
          screenshotsBefore: screenshots.length > 0 ? screenshotsBefore : f.screenshotsBefore,
          screenshotsAfter:  screenshots.length > 0 ? screenshotsAfter  : f.screenshotsAfter,
        };
      }),
    }));
  }, [app.id, app.name, screenshots]);

  const eventByDate = useMemo(() => {
    const m = new Map<string, UpdateEvent>();
    for (const e of appEvents) m.set(e.date, e);
    return m;
  }, [appEvents]);

  function toggleField(f: string) {
    setSelectedFields(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; });
  }

  function handleRangeChange(start: Date, end: Date) {
    setRangeStart(start);
    setRangeEnd(end);
  }

  if (isLocked) {
    return (
      <main className="flex flex-col h-full overflow-hidden bg-[#111318]">
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          {app.icon_url && <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />}
          <p className="text-sm font-semibold text-white">{app.name}</p>
        </div>
        <FeatureLocked
          title="Timeline is a Pro feature"
          description="Upgrade to Pro or above to see your metadata's update history."
        />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full overflow-hidden bg-[#111318]">
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
          app={app}
          allDates={allDates}
          dateOffset={dateOffset}
          onOffsetChange={setDateOffset}
          eventByDate={eventByDate}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
        />

        {selectedEvent ? (
          <BeforeAfterPanel
            event={selectedEvent}
            selectedFields={selectedFields}
            showDiff={showDiff}
            onShowDiffChange={setShowDiff}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600">Click an update dot on the timeline to compare before &amp; after</p>
          </div>
        )}
    </main>
  );
}
