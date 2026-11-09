// One compact card of labelled numbers, split by hairlines (the 1px gaps
// show the ring color through). Keyword Research's side pane uses it for
// both the Inspector and Performance tabs, in place of a grid of separate
// stat cards, so a keyword's numbers read at a glance in a narrow pane.
import Link from "next/link";
import { LockClosedIcon } from "@heroicons/react/24/outline";

export type StatStripItem = {
  label: string;
  value: string;
  // A word after the number, e.g. "High" next to a volume.
  note?: string;
  // Color for the number and note; plain white/gray-900 when omitted.
  tone?: string;
  // Color for just the note, when only it is colored (e.g. Volume's "High").
  noteTone?: string;
  // Hover text explaining the stat.
  hint?: string;
  // A status rather than a number ("Unranked", "Not connected"): smaller
  // and grey, so it doesn't read as a value.
  muted?: boolean;
  // Plan-gated: shows a "Pro" badge linking to the subscription page
  // instead of the value (same style as Keyword Research's locked cells).
  locked?: boolean;
};

export function StatStrip({ items, columns, loading = false }: {
  items: StatStripItem[];
  columns: 3 | 4;
  loading?: boolean;
}) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-xl bg-white/[0.06] light:bg-gray-950/[0.07] ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm ${
      columns === 4 ? "grid-cols-4" : "grid-cols-3"
    }`}>
      {items.map((item) => (
        <div key={item.label} title={item.hint} className="min-w-0 bg-[#141417] light:bg-white px-3 py-2.5">
          {/* Wraps rather than truncating: the pane can be as narrow as
              ~380px, where four columns leave little room per label. */}
          <p className="text-[11px] leading-tight text-gray-500">{item.label}</p>
          {loading ? (
            <div className="mt-1.5 h-5 w-10 rounded bg-white/[0.06] light:bg-black/[0.05] animate-pulse" />
          ) : item.locked ? (
            <div className="mt-1 flex h-7 items-center">
              <Link
                href="/dashboard/subscription"
                title={`${item.label} requires the Pro plan`}
                className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-400 light:text-violet-700 transition-opacity hover:opacity-75"
              >
                <LockClosedIcon className="size-3" />
                Pro
              </Link>
            </div>
          ) : (
            <p className={`mt-0.5 flex flex-wrap items-baseline gap-x-1 ${item.muted ? "text-gray-500" : item.tone ?? "text-white light:text-gray-900"}`}>
              <span className={item.muted ? "text-xs leading-7" : "text-lg font-semibold tabular-nums"}>{item.value}</span>
              {item.note && <span className={`text-[11px] font-medium ${item.noteTone ?? ""}`}>{item.note}</span>}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
