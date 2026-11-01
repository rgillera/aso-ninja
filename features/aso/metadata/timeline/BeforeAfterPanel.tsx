import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { UpdateEvent } from "./types";
import { WordDiff } from "./WordDiff";
import { ScreenshotComparison } from "./ScreenshotComparison";
import { fromDateStr } from "./utils";

type Props = {
  event: UpdateEvent;
  // Which app changed: yours or a competitor's.
  appName: string;
  selectedFields: Set<string>;
};

export function BeforeAfterPanel({ event, appName, selectedFields }: Props) {
  const panelFields = event.fields.filter(f => selectedFields.has(f.field));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#0e0e10] light:bg-[#f7f7f8] grid grid-cols-3 items-center border-b border-white/[0.07] light:border-black/[0.08] py-3 px-6">
        <div className="text-center text-sm font-semibold text-gray-300 light:text-gray-700">
          Before <InformationCircleIcon className="size-3.5 text-gray-600 light:text-gray-400 inline ml-0.5 -mt-0.5" />
        </div>
        <div className="flex justify-center min-w-0">
          <span className="truncate rounded-full bg-teal-500/15 text-teal-400 light:text-teal-700 ring-1 ring-teal-500/30 px-4 py-0.5 text-xs font-semibold">
            {appName} &middot; {fromDateStr(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="text-center text-sm font-semibold text-gray-300 light:text-gray-700">
          After <InformationCircleIcon className="size-3.5 text-gray-600 light:text-gray-400 inline ml-0.5 -mt-0.5" />
        </div>
      </div>

      {/* Version */}
      <div className="grid grid-cols-3 items-center py-4 px-6 border-b border-white/[0.04] light:border-black/[0.05]">
        <div className="flex justify-end pr-12">
          <span className="text-sm font-medium text-gray-400 light:text-gray-600">{event.versionBefore}</span>
        </div>
        <div className="text-center text-xs text-gray-600 light:text-gray-400">Version</div>
        <div className="pl-12">
          <span className="text-sm font-medium text-white light:text-gray-900">{event.versionAfter}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="divide-y divide-white/[0.04] light:divide-black/[0.06]">
        {panelFields.map(fu => (
          <div key={fu.field}>
            <div className="flex justify-center py-3">
              <span className="rounded-full bg-[#141417] light:bg-white px-3 py-0.5 text-[11px] text-gray-500">{fu.field}</span>
            </div>

            {fu.field === "Screenshots" && fu.screenshotsBefore ? (
              <ScreenshotComparison before={fu.screenshotsBefore} after={fu.screenshotsAfter ?? []} />
            ) : (
              <div className="grid grid-cols-3 gap-6 px-8 pb-5">
                <div className="flex justify-end">
                  <p className="text-sm text-gray-400 light:text-gray-600 text-right max-w-xs leading-relaxed whitespace-pre-line">
                    {fu.before || <span className="italic text-gray-700 light:text-gray-300">empty</span>}
                  </p>
                </div>
                <div />
                <div className="max-w-xs">
                  <p className="text-sm text-white light:text-gray-900 leading-relaxed">
                    {fu.after
                      ? <WordDiff before={fu.before} after={fu.after} />
                      : <span className="italic text-gray-700 light:text-gray-300">empty</span>}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
