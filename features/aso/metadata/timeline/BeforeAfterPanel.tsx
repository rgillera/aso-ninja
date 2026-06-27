import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { UpdateEvent } from "./types";
import { WordDiff } from "./WordDiff";
import { ScreenshotComparison } from "./ScreenshotComparison";

type Props = {
  event: UpdateEvent;
  selectedFields: Set<string>;
  showDiff: boolean;
  onShowDiffChange: (v: boolean) => void;
};

export function BeforeAfterPanel({ event, selectedFields, showDiff, onShowDiffChange }: Props) {
  const panelFields = event.fields.filter(f => selectedFields.has(f.field));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#111318] grid grid-cols-3 items-center border-b border-white/[0.07] py-3 px-6">
        <div className="text-center text-sm font-semibold text-gray-300">
          Before <InformationCircleIcon className="size-3.5 text-gray-600 inline ml-0.5 -mt-0.5" />
        </div>
        <div className="flex justify-center">
          <span className="rounded-full bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30 px-4 py-0.5 text-xs font-semibold">Updates</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm font-semibold text-gray-300">
            After <InformationCircleIcon className="size-3.5 text-gray-600 inline ml-0.5 -mt-0.5" />
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="relative inline-flex h-4 w-7 shrink-0">
              <input type="checkbox" className="sr-only peer" checked={showDiff} onChange={e => onShowDiffChange(e.target.checked)} />
              <span className="rounded-full bg-[#0d0f14] ring-1 ring-white/[0.08] w-full peer-checked:bg-teal-600 transition-colors" />
              <span className="absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform peer-checked:translate-x-3 shadow" />
            </span>
            <span className="text-[10px] text-gray-500 whitespace-nowrap">Show changes</span>
          </label>
        </div>
      </div>

      {/* Version */}
      <div className="grid grid-cols-3 items-center py-4 px-6 border-b border-white/[0.04]">
        <div className="flex justify-end pr-12">
          <span className="text-sm font-medium text-gray-400">{event.versionBefore}</span>
        </div>
        <div className="text-center text-xs text-gray-600">Version</div>
        <div className="pl-12">
          <span className="text-sm font-medium text-white">{event.versionAfter}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="divide-y divide-white/[0.04]">
        {panelFields.map(fu => (
          <div key={fu.field}>
            <div className="flex justify-center py-3">
              <span className="rounded-full bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-0.5 text-[11px] text-gray-500">{fu.field}</span>
            </div>

            {fu.field === "Screenshots" && fu.screenshotsBefore ? (
              <ScreenshotComparison before={fu.screenshotsBefore} after={fu.screenshotsAfter ?? []} />
            ) : (
              <div className="grid grid-cols-3 gap-6 px-8 pb-5">
                <div className="flex justify-end">
                  <p className="text-sm text-gray-400 text-right max-w-xs leading-relaxed">
                    {fu.before || <span className="italic text-gray-700">empty</span>}
                  </p>
                </div>
                <div />
                <div className="space-y-1 max-w-xs">
                  <p className="text-sm text-white leading-relaxed">
                    {fu.after || <span className="italic text-gray-700">empty</span>}
                  </p>
                  {showDiff && fu.before !== fu.after && (
                    <p className="text-sm"><WordDiff before={fu.before} after={fu.after} /></p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
