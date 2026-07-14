import { LockClosedIcon } from "@heroicons/react/24/outline";

export function TranslateToggle({ checked, onChange, locked }: { checked: boolean; onChange: () => void; locked: boolean }) {
  if (locked) {
    return (
      <div className="flex items-center gap-2 shrink-0" title="Upgrade to Pro to translate keywords to English">
        <span className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
          <LockClosedIcon className="size-3" />
          Translate to English
        </span>
        <span className="rounded-full bg-red-500/10 px-1.5 py-px text-[10px] font-semibold text-red-500">Pro</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-gray-500 whitespace-nowrap">Translate to English</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function AnalyzeAllButton({ onClick, locked }: { onClick: () => void; locked?: boolean }) {
  if (locked) {
    return (
      <span
        className="flex items-center gap-1 text-xs text-gray-600 cursor-not-allowed whitespace-nowrap"
        title="Upgrade to Pro+ to analyze all keywords at once"
      >
        <LockClosedIcon className="size-3" />
        + Analyze all
        <span className="rounded-full bg-red-500/10 px-1.5 py-px text-[10px] font-semibold text-red-500">Pro+</span>
      </span>
    );
  }
  return (
    <button onClick={onClick} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap">
      + Analyze all
    </button>
  );
}

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
      <span className="text-sm text-gray-300 shrink-0">{value}</span>
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
