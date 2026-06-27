import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { ScreenshotItem, ScreenshotStatus } from "./types";
import { SS_GRADIENTS } from "./constants";

function ScreenshotCard({ gradientIdx, status, url }: { gradientIdx: number; status: ScreenshotStatus; url?: string }) {
  const grad = SS_GRADIENTS[gradientIdx % SS_GRADIENTS.length];
  const barCls = {
    removed:      "bg-red-500",
    added:        "bg-green-500",
    repositioned: "bg-yellow-400",
    unchanged:    "bg-white/10",
  }[status];

  return (
    <div className="flex-shrink-0 flex flex-col gap-1.5">
      <div className={`w-[80px] h-[172px] rounded-2xl ring-1 ring-white/10 overflow-hidden ${url ? "" : `bg-gradient-to-b ${grad} flex flex-col`}`}>
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="flex justify-center pt-2">
              <div className="w-10 h-1 rounded-full bg-black/30" />
            </div>
            <div className="flex-1 flex flex-col justify-end px-2 pb-3 gap-1.5">
              <div className="h-2 rounded bg-white/20 w-3/4" />
              <div className="h-1.5 rounded bg-white/15 w-full" />
              <div className="h-1.5 rounded bg-white/15 w-5/6" />
              <div className="mt-1 h-5 rounded-lg bg-white/25 w-full" />
            </div>
          </>
        )}
      </div>
      <div className={`h-1 rounded-full ${barCls} transition-colors`} />
    </div>
  );
}

export function ScreenshotComparison({ before, after }: { before: ScreenshotItem[]; after: ScreenshotItem[] }) {
  return (
    <div className="px-6 pb-6">
      <div className="grid grid-cols-2 divide-x divide-white/[0.06] rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
        <div className="bg-[#0d0f14]/60 p-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {before.map((ss, i) => (
              <ScreenshotCard key={i} gradientIdx={i} status={ss.status} url={ss.url} />
            ))}
          </div>
        </div>
        <div className="bg-[#0d0f14]/60 p-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {after.map((ss, i) => (
              <ScreenshotCard key={i} gradientIdx={before.length + i} status={ss.status} url={ss.url} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-gray-600 text-center leading-relaxed">
        <InformationCircleIcon className="size-3 inline -mt-0.5 mr-0.5" />
        <span className="text-red-500/70">Red lines</span> show screenshots that have been removed.{" "}
        <span className="text-yellow-500/70">Yellow lines</span> show screenshots that changed position.{" "}
        <span className="text-green-500/70">Green lines</span> show screenshots that were added.
      </p>
    </div>
  );
}
