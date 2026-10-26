import { LockClosedIcon } from "@heroicons/react/24/outline";

// Tooltip body for a Pro-only estimate (searches/day, impressions): the
// label with a small Pro pill in place of the number, plus an optional
// muted line for what the hover still does.
export function ProLockedHint({ label, footer }: { label: string; footer?: string }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-px text-[10px] font-semibold text-violet-400 light:text-violet-700">
          <LockClosedIcon className="size-2.5" />
          Pro
        </span>
      </span>
      {footer && <span className="text-gray-500">{footer}</span>}
    </span>
  );
}
