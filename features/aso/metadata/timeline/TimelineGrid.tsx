"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";
import type { UpdateEvent } from "./types";
import { COL_W, LABEL_W, DAYS_SHOWN } from "./constants";
import { toDateStr } from "./utils";

type Props = {
  app: App;
  allDates: Date[];
  dateOffset: number;
  onOffsetChange: (offset: number) => void;
  eventByDate: Map<string, UpdateEvent>;
  selectedEvent: UpdateEvent | null;
  onSelectEvent: (event: UpdateEvent | null) => void;
};

function AppIcon({ app }: { app: App }) {
  return app.icon_url
    ? <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover" />
    : (
      <div className="size-8 rounded-xl bg-[#0d0f14] flex items-center justify-center">
        <DevicePhoneMobileIcon className="size-4 text-gray-500" />
      </div>
    );
}

export function TimelineGrid({ app, allDates, dateOffset, onOffsetChange, eventByDate, selectedEvent, onSelectEvent }: Props) {
  const visibleDates = allDates.slice(dateOffset, dateOffset + DAYS_SHOWN);

  const yearMonthGroups = useMemo(() => {
    const years:  { year: number; days: number }[]  = [];
    const months: { label: string; days: number }[] = [];
    for (const d of visibleDates) {
      const yr = d.getFullYear();
      const mo = d.toLocaleString("en-US", { month: "long" });
      if (!years.length  || years[years.length - 1].year   !== yr) years.push({ year: yr, days: 1 });   else years[years.length - 1].days++;
      if (!months.length || months[months.length - 1].label !== mo) months.push({ label: mo, days: 1 }); else months[months.length - 1].days++;
    }
    return { years, months };
  }, [visibleDates]);

  const visibleEventDates = useMemo(() => {
    const s = new Set<string>();
    for (const d of visibleDates) {
      const ds = toDateStr(d);
      if (eventByDate.has(ds)) s.add(ds);
    }
    return s;
  }, [visibleDates, eventByDate]);

  return (
    <div className="shrink-0 relative border-b border-white/[0.07] overflow-x-auto">
      {/* Prev */}
      <button
        onClick={() => onOffsetChange(Math.max(0, dateOffset - DAYS_SHOWN))}
        disabled={dateOffset === 0}
        className="absolute left-[52px] top-1/2 -translate-y-1/2 z-20 flex items-center justify-center size-5 rounded-full bg-[#1a1d24] ring-1 ring-white/[0.08] text-gray-400 hover:text-white disabled:opacity-20 transition-colors shadow-md"
      >
        <ChevronLeftIcon className="size-3" />
      </button>
      {/* Next */}
      <button
        onClick={() => onOffsetChange(Math.min(allDates.length - DAYS_SHOWN, dateOffset + DAYS_SHOWN))}
        disabled={dateOffset + DAYS_SHOWN >= allDates.length}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center size-5 rounded-full bg-[#1a1d24] ring-1 ring-white/[0.08] text-gray-400 hover:text-white disabled:opacity-20 transition-colors shadow-md"
      >
        <ChevronRightIcon className="size-3" />
      </button>

      <div style={{ minWidth: LABEL_W + visibleDates.length * COL_W }}>
        {/* Year row */}
        <div className="flex">
          <div style={{ width: LABEL_W }} className="shrink-0" />
          {yearMonthGroups.years.map((g, i) => (
            <div key={i} style={{ width: g.days * COL_W }} className="text-[10px] text-gray-600 px-2 pt-1.5">{g.year}</div>
          ))}
        </div>

        {/* Month row */}
        <div className="flex">
          <div style={{ width: LABEL_W }} className="shrink-0" />
          {yearMonthGroups.months.map((g, i) => (
            <div key={i} style={{ width: g.days * COL_W }} className="text-[10px] font-medium text-gray-500 px-2 pb-1 border-l border-white/[0.04]">{g.label}</div>
          ))}
        </div>

        {/* Day numbers */}
        <div className="flex border-t border-white/[0.05]">
          <div style={{ width: LABEL_W }} className="shrink-0" />
          {visibleDates.map((d, i) => {
            const ds    = toDateStr(d);
            const isSel = selectedEvent?.date === ds;
            return (
              <div key={i} style={{ width: COL_W }} className={`flex items-center justify-center pt-1 pb-0.5 ${isSel ? "bg-white/[0.04]" : ""}`}>
                <span className={`text-[10px] ${isSel ? "text-white font-semibold" : visibleEventDates.has(ds) ? "text-gray-400" : "text-gray-700"}`}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* App icon row with update dots */}
        <div className="flex items-center" style={{ height: 52 }}>
          <div style={{ width: LABEL_W }} className="shrink-0 flex items-center justify-center">
            <AppIcon app={app} />
          </div>
          {visibleDates.map((d, i) => {
            const ds    = toDateStr(d);
            const event = eventByDate.get(ds);
            const isSel = selectedEvent?.date === ds;
            return (
              <div key={i} style={{ width: COL_W }} className={`flex items-center justify-center h-full ${isSel ? "bg-white/[0.04]" : ""}`}>
                {event && (
                  <button
                    onClick={() => onSelectEvent(isSel ? null : event)}
                    title={`${event.fields.length} field${event.fields.length !== 1 ? "s" : ""} updated`}
                    className={`size-2.5 rounded-full transition-all duration-150 ${
                      isSel
                        ? "bg-teal-300 scale-125 ring-2 ring-teal-400/40"
                        : "bg-teal-500 hover:bg-teal-400 hover:scale-110"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
