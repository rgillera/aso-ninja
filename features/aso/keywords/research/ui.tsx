export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-8 h-4 min-w-[2rem] min-h-[1rem] shrink-0 grow-0 basis-auto p-0 border-0 appearance-none inline-block rounded-full overflow-hidden transition-colors relative ${checked ? "bg-indigo-500" : "bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

export function VolumeBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300 w-6 text-right shrink-0">{value}</span>
      <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function GrowthCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-600">—</span>;
  if (value === 0) return <span className="text-xs text-gray-500">0%</span>;
  const up = value > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "+" : ""}{value}%
    </span>
  );
}
