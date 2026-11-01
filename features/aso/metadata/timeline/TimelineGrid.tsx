"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { SelectedUpdate, TimelineRow } from "./types";
import { COL_W, LABEL_W, DAYS_SHOWN } from "./constants";
import { toDateStr } from "./utils";

type Props = {
  rows: TimelineRow[];
  allDates: Date[];
  dateOffset: number;
  onOffsetChange: (offset: number) => void;
  selected: SelectedUpdate | null;
  onSelect: (selected: SelectedUpdate | null) => void;
};

function RowIcon({ row }: { row: TimelineRow }) {
  return row.iconUrl
    ? <img src={row.iconUrl} alt={row.name} title={row.name} className={`rounded-xl object-cover ${row.isCompetitor ? "size-7" : "size-8"}`} />
    : (
      <div title={row.name} className="size-8 rounded-xl bg-[#0a0a0c] light:bg-gray-100 flex items-center justify-center">
        <DevicePhoneMobileIcon className="size-4 text-gray-500" />
      </div>
    );
}

export function TimelineGrid({ rows, allDates, dateOffset, onOffsetChange, selected, onSelect }: Props) {
  const visibleDates = allDates.slice(dateOffset, dateOffset + DAYS_SHOWN);

  const yearMonthGroups = useMemo(() => {
    const years: { year: number; days: number }[] = [];
    const months: { label: string; days: number }[] = [];
    for (const d of visibleDates) {
      const yr = d.getFullYear();
      const mo = d.toLocaleString("en-US", { month: "long" });
      if (!years.length || years[years.length - 1].year !== yr) years.push({ year: yr, days: 1 }); else years[years.length - 1].days++;
      if (!months.length || months[months.length - 1].label !== mo) months.push({ label: mo, days: 1 }); else months[months.length - 1].days++;
    }
    return { years, months };
  }, [visibleDates]);

  // Days where any row changed get a brighter day number.
  const visibleEventDates = useMemo(() => {
    const s = new Set<string>();
    for (const d of visibleDates) {
      const ds = toDateStr(d);
      if (rows.some(r => r.eventByDate.has(ds))) s.add(ds);
    }
    return s;
  }, [visibleDates, rows]);

  return (
    <div className="shrink-0 relative border-b border-white/[0.07] light:border-black/[0.08] overflow-x-auto max-h-[45vh] overflow-y-auto">
      {/* Prev */}
      <button
        onClick={() => onOffsetChange(Math.max(0, dateOffset - DAYS_SHOWN))}
        disabled={dateOffset === 0}
        className="absolute left-[52px] top-[30px] z-20 flex items-center justify-center size-5 rounded-full bg-[#141417] light:bg-white text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 disabled:opacity-20 transition-colors shadow-md light:shadow-black/10"
      >
        <ChevronLeftIcon className="size-3" />
      </button>
      {/* Next */}
      <button
        onClick={() => onOffsetChange(Math.min(allDates.length - DAYS_SHOWN, dateOffset + DAYS_SHOWN))}
        disabled={dateOffset + DAYS_SHOWN >= allDates.length}
        className="absolute right-1 top-[30px] z-20 flex items-center justify-center size-5 rounded-full bg-[#141417] light:bg-white text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 disabled:opacity-20 transition-colors shadow-md light:shadow-black/10"
      >
        <ChevronRightIcon className="size-3" />
      </button>

      <div style={{ minWidth: LABEL_W + visibleDates.length * COL_W }}>
        {/* Year row */}
        <div className="flex">
          <div style={{ width: LABEL_W }} className="shrink-0" />
          {yearMonthGroups.years.map((g, i) => (
            <div key={i} style={{ width: g.days * COL_W }} className="text-[10px] text-gray-600 light:text-gray-400 px-2 pt-1.5">{g.year}</div>
          ))}
        </div>

        {/* Month row */}
        <div className="flex">
          <div style={{ width: LABEL_W }} className="shrink-0" />
          {yearMonthGroups.months.map((g, i) => (
            <div key={i} style={{ width: g.days * COL_W }} className="text-[10px] font-medium text-gray-500 px-2 pb-1 border-l border-white/[0.04] light:border-black/[0.05]">{g.label}</div>
          ))}
        </div>

        {/* Day numbers */}
        <div className="flex border-t border-white/[0.05] light:border-black/[0.06]">
          <div style={{ width: LABEL_W }} className="shrink-0" />
          {visibleDates.map((d, i) => {
            const ds = toDateStr(d);
            const isSel = selected?.event.date === ds;
            return (
              <div key={i} style={{ width: COL_W }} className={`flex items-center justify-center pt-1 pb-0.5 ${isSel ? "bg-white/[0.04] light:bg-black/[0.04]" : ""}`}>
                <span className={`text-[10px] ${isSel ? "text-white light:text-gray-900 font-semibold" : visibleEventDates.has(ds) ? "text-gray-400 light:text-gray-600" : "text-gray-700 light:text-gray-300"}`}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* One row per app: yours first, then competitors */}
        {rows.map((row, ri) => (
          <div
            key={row.key}
            className={`flex items-center ${ri > 0 ? "border-t border-white/[0.04] light:border-black/[0.05]" : ""}`}
            style={{ height: row.isCompetitor ? 44 : 52 }}
          >
            <div style={{ width: LABEL_W }} className="shrink-0 flex items-center justify-center">
              <RowIcon row={row} />
            </div>
            {visibleDates.map((d, i) => {
              const ds = toDateStr(d);
              const event = row.eventByDate.get(ds);
              const isSelCol = selected?.event.date === ds;
              const isSel = isSelCol && selected?.rowKey === row.key;
              return (
                <div key={i} style={{ width: COL_W }} className={`flex items-center justify-center h-full ${isSelCol ? "bg-white/[0.04] light:bg-black/[0.04]" : ""}`}>
                  {event && (
                    <button
                      onClick={() => onSelect(isSel ? null : { rowKey: row.key, rowName: row.name, event })}
                      title={`${row.name}: ${event.fields.length} field${event.fields.length !== 1 ? "s" : ""} updated`}
                      className="group flex items-center justify-center size-6 rounded-full"
                    >
                      <span
                        className={`size-2.5 rounded-full transition-all duration-150 ${
                          isSel
                            ? "bg-teal-300 scale-125 ring-2 ring-teal-400/40"
                            : "bg-teal-500 group-hover:bg-teal-400 group-hover:scale-110"
                        }`}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
