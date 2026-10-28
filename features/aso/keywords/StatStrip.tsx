// One compact card of labelled numbers, split by hairlines (the 1px gaps
// show the ring color through). Keyword Research's side pane uses it for
// both the Inspector and Performance tabs, in place of a grid of separate
// stat cards, so a keyword's numbers read at a glance in a narrow pane.
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
