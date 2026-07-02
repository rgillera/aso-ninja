"use client";

import { XMarkIcon, DevicePhoneMobileIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { IosStatusIcons } from "./PhonePreview";
import type { App, StoreData } from "@/libs/contracts";

type Props = {
  app: App;
  storeData: StoreData;
  onClose: () => void;
};

export default function SearchPreviewModal({ app, storeData, onClose }: Props) {
  const screenshots = storeData?.screenshotUrls ?? [];
  const rating = storeData?.rating;
  const ratingCount = storeData?.ratingCount;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#1a1d24] p-8 ring-1 ring-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-5 top-5 text-gray-500 hover:text-gray-300 transition-colors">
          <XMarkIcon className="size-5" />
        </button>

        <h2 className="text-xl font-semibold text-white">Search Preview for {app.name}</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          See how your new app metadata version looks like in the store search view.
        </p>

        <div className="relative mx-auto mt-6 w-[340px] overflow-hidden rounded-[36px] bg-white shadow-2xl ring-[6px] ring-gray-700">
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-black">
            <span>9:41</span>
            <IosStatusIcons className="text-black" />
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 px-4 pt-2 pb-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
              <MagnifyingGlassIcon className="size-4 shrink-0 text-gray-400" />
              <span className="truncate text-sm text-gray-700">{app.name}</span>
            </div>
            <span className="shrink-0 text-sm font-medium text-blue-500">Cancel</span>
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {/* Top result */}
            <div className="border-t border-gray-100 px-4 pt-4 pb-5">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {app.icon_url ? (
                    <img src={app.icon_url} alt={app.name} className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-black/5" />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gray-200">
                      <DevicePhoneMobileIcon className="size-6 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{app.name}</p>
                    <p className="truncate text-xs text-gray-500">{storeData?.subtitle ?? app.bundle_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {rating !== undefined ? (
                    <span className="flex items-center gap-1 text-gray-700">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <StarSolid key={i} className={`size-3 ${i <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"}`} />
                      ))}
                      <span className="ml-1 text-gray-500">{ratingCount ?? 0}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">No Ratings</span>
                  )}
                  <span className="ml-auto text-gray-500">In-App Purchases</span>
                </div>
                <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {screenshots.length > 0
                    ? screenshots.slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="h-44 w-24 shrink-0 rounded-xl object-cover object-top" />
                      ))
                    : [0, 1, 2].map((i) => <div key={i} className="h-44 w-24 shrink-0 rounded-xl bg-gray-200" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
